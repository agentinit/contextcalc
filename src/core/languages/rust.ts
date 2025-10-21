import type Parser from 'tree-sitter';
import type { ASTSymbol, FunctionSymbol, StructSymbol, EnumSymbol, TraitSymbol, ImportSymbol, VariableSymbol, SourceLocation, Parameter } from '../../types/index.js';
import type { LanguageConfig } from './index.js';
import { SymbolType as ST } from '../../types/index.js';

export const RustConfig: LanguageConfig = {
  name: 'Rust',
  extensions: ['.rs'],

  loadGrammar: async () => {
    const RustLanguage = await import('tree-sitter-rust');
    return RustLanguage.default;
  },

  extractSymbols: (tree: Parser.Tree, sourceCode: string): ASTSymbol[] => {
    const symbols: ASTSymbol[] = [];
    const rootNode = tree.rootNode;

    function getLocation(node: Parser.SyntaxNode): SourceLocation {
      return {
        startLine: node.startPosition.row + 1,
        startColumn: node.startPosition.column,
        endLine: node.endPosition.row + 1,
        endColumn: node.endPosition.column,
        startByte: node.startIndex,
        endByte: node.endIndex
      };
    }

    function getNodeText(node: Parser.SyntaxNode): string {
      return sourceCode.slice(node.startIndex, node.endIndex);
    }

    function extractParameters(node: Parser.SyntaxNode): Parameter[] {
      const params: Parameter[] = [];
      const paramsNode = node.childForFieldName('parameters');

      if (paramsNode) {
        for (const child of paramsNode.namedChildren) {
          if (child.type === 'parameter') {
            const patternNode = child.childForFieldName('pattern');
            const typeNode = child.childForFieldName('type');

            if (patternNode) {
              const name = patternNode.type === 'identifier' ? getNodeText(patternNode) :
                           patternNode.childForFieldName('name') ? getNodeText(patternNode.childForFieldName('name')!) :
                           getNodeText(patternNode);

              if (name !== 'self' && name !== '&self' && name !== '&mut self') {
                params.push({
                  name,
                  type: typeNode ? getNodeText(typeNode) : undefined
                });
              }
            }
          }
        }
      }

      return params;
    }

    function extractFunction(node: Parser.SyntaxNode): FunctionSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const parameters = extractParameters(node);
      const returnTypeNode = node.childForFieldName('return_type');
      const isAsync = node.children.some(c => c.type === 'async');

      return {
        name: getNodeText(nameNode),
        type: ST.FUNCTION,
        location: getLocation(node),
        parameters,
        returnType: returnTypeNode ? getNodeText(returnTypeNode) : undefined,
        async: isAsync
      };
    }

    function extractStruct(node: Parser.SyntaxNode): StructSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const fields: { name: string; type?: string }[] = [];
      const bodyNode = node.childForFieldName('body');

      if (bodyNode && bodyNode.type === 'field_declaration_list') {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'field_declaration') {
            const fieldName = child.childForFieldName('name');
            const fieldType = child.childForFieldName('type');

            if (fieldName) {
              fields.push({
                name: getNodeText(fieldName),
                type: fieldType ? getNodeText(fieldType) : undefined
              });
            }
          }
        }
      }

      return {
        name: getNodeText(nameNode),
        type: ST.STRUCT,
        location: getLocation(node),
        fields
      };
    }

    function extractEnum(node: Parser.SyntaxNode): EnumSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: { name: string; value?: string }[] = [];
      const bodyNode = node.childForFieldName('body');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'enum_variant') {
            const variantName = child.childForFieldName('name');
            if (variantName) {
              members.push({
                name: getNodeText(variantName),
                value: getNodeText(child)
              });
            }
          }
        }
      }

      return {
        name: getNodeText(nameNode),
        type: ST.ENUM,
        location: getLocation(node),
        members
      };
    }

    function extractTrait(node: Parser.SyntaxNode): TraitSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const bodyNode = node.childForFieldName('body');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'function_item' || child.type === 'function_signature_item') {
            const func = extractFunction(child);
            if (func) {
              func.type = ST.METHOD;
              members.push(func);
            }
          }
        }
      }

      return {
        name: getNodeText(nameNode),
        type: ST.TRAIT,
        location: getLocation(node),
        members
      };
    }

    function extractImport(node: Parser.SyntaxNode): ImportSymbol | null {
      const imports: string[] = [];
      let from = '';

      const declarationNode = node.namedChildren[0];
      if (declarationNode) {
        const text = getNodeText(declarationNode);
        from = text;

        // Extract individual imports from use statement
        const useTree = declarationNode.descendantsOfType('identifier');
        for (const id of useTree) {
          const idText = getNodeText(id);
          if (idText && !imports.includes(idText)) {
            imports.push(idText);
          }
        }
      }

      return {
        name: from,
        type: ST.IMPORT,
        location: getLocation(node),
        from,
        imports: imports.length > 0 ? imports : [from]
      };
    }

    function extractVariable(node: Parser.SyntaxNode, isConst: boolean = false): VariableSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const typeNode = node.childForFieldName('type');
      const valueNode = node.childForFieldName('value');

      return {
        name: getNodeText(nameNode),
        type: isConst ? ST.CONSTANT : ST.VARIABLE,
        location: getLocation(node),
        variableType: typeNode ? getNodeText(typeNode) : undefined,
        value: valueNode ? getNodeText(valueNode) : undefined
      };
    }

    function traverse(node: Parser.SyntaxNode) {
      const isTopLevel = node.parent?.type === 'source_file';

      if (isTopLevel) {
        if (node.type === 'function_item') {
          const func = extractFunction(node);
          if (func) symbols.push(func);
        } else if (node.type === 'struct_item') {
          const struct = extractStruct(node);
          if (struct) symbols.push(struct);
        } else if (node.type === 'enum_item') {
          const enumDecl = extractEnum(node);
          if (enumDecl) symbols.push(enumDecl);
        } else if (node.type === 'trait_item') {
          const trait = extractTrait(node);
          if (trait) symbols.push(trait);
        } else if (node.type === 'impl_item') {
          // Extract methods from impl blocks
          const bodyNode = node.childForFieldName('body');
          if (bodyNode) {
            for (const child of bodyNode.namedChildren) {
              if (child.type === 'function_item') {
                const method = extractFunction(child);
                if (method) {
                  method.type = ST.METHOD;
                  symbols.push(method);
                }
              }
            }
          }
        } else if (node.type === 'use_declaration') {
          const importDecl = extractImport(node);
          if (importDecl) symbols.push(importDecl);
        } else if (node.type === 'const_item') {
          const variable = extractVariable(node, true);
          if (variable) symbols.push(variable);
        } else if (node.type === 'static_item') {
          const variable = extractVariable(node, false);
          if (variable) symbols.push(variable);
        }
      }

      for (const child of node.children) {
        traverse(child);
      }
    }

    traverse(rootNode);
    return symbols;
  }
};
