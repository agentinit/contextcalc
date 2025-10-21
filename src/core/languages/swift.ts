import type Parser from 'tree-sitter';
import type { ASTSymbol, FunctionSymbol, ClassSymbol, StructSymbol, EnumSymbol, InterfaceSymbol, ImportSymbol, VariableSymbol, SourceLocation, Parameter } from '../../types/index.js';
import type { LanguageConfig } from './index.js';
import { SymbolType as ST } from '../../types/index.js';

export const SwiftConfig: LanguageConfig = {
  name: 'Swift',
  extensions: ['.swift'],

  loadGrammar: async () => {
    const SwiftLanguage = await import('tree-sitter-swift');
    return SwiftLanguage.default;
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
            const nameNode = child.childForFieldName('name');
            const typeNode = child.childForFieldName('type');
            const defaultNode = child.childForFieldName('default_value');

            if (nameNode) {
              params.push({
                name: getNodeText(nameNode),
                type: typeNode ? getNodeText(typeNode) : undefined,
                defaultValue: defaultNode ? getNodeText(defaultNode) : undefined
              });
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
      const resultNode = node.childForFieldName('result');
      const isAsync = node.children.some(c => c.type === 'async');

      return {
        name: getNodeText(nameNode),
        type: ST.FUNCTION,
        location: getLocation(node),
        parameters,
        returnType: resultNode ? getNodeText(resultNode) : undefined,
        async: isAsync
      };
    }

    function extractClass(node: Parser.SyntaxNode): ClassSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const bodyNode = node.childForFieldName('body');
      const inheritanceNode = node.childForFieldName('inheritance');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'function_declaration') {
            const method = extractFunction(child);
            if (method) {
              method.type = ST.METHOD;
              members.push(method);
            }
          } else if (child.type === 'property_declaration') {
            for (const binding of child.descendantsOfType('pattern_binding')) {
              const patternNode = binding.childForFieldName('pattern');
              const typeNode = binding.childForFieldName('type');

              if (patternNode) {
                members.push({
                  name: getNodeText(patternNode),
                  type: ST.VARIABLE,
                  location: getLocation(binding),
                  variableType: typeNode ? getNodeText(typeNode) : undefined
                } as VariableSymbol);
              }
            }
          }
        }
      }

      return {
        name: getNodeText(nameNode),
        type: ST.CLASS,
        location: getLocation(node),
        extends: inheritanceNode ? getNodeText(inheritanceNode) : undefined,
        members
      };
    }

    function extractStruct(node: Parser.SyntaxNode): StructSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const fields: { name: string; type?: string }[] = [];
      const bodyNode = node.childForFieldName('body');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'property_declaration') {
            for (const binding of child.descendantsOfType('pattern_binding')) {
              const patternNode = binding.childForFieldName('pattern');
              const typeNode = binding.childForFieldName('type');

              if (patternNode) {
                fields.push({
                  name: getNodeText(patternNode),
                  type: typeNode ? getNodeText(typeNode) : undefined
                });
              }
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
          if (child.type === 'enum_case_declaration') {
            for (const caseChild of child.namedChildren) {
              if (caseChild.type === 'enum_case') {
                const caseName = caseChild.childForFieldName('name');
                if (caseName) {
                  members.push({
                    name: getNodeText(caseName)
                  });
                }
              }
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

    function extractProtocol(node: Parser.SyntaxNode): InterfaceSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const bodyNode = node.childForFieldName('body');
      const inheritanceNode = node.childForFieldName('inheritance');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'function_declaration') {
            const method = extractFunction(child);
            if (method) {
              method.type = ST.METHOD;
              members.push(method);
            }
          } else if (child.type === 'property_declaration') {
            for (const binding of child.descendantsOfType('pattern_binding')) {
              const patternNode = binding.childForFieldName('pattern');
              const typeNode = binding.childForFieldName('type');

              if (patternNode) {
                members.push({
                  name: getNodeText(patternNode),
                  type: ST.VARIABLE,
                  location: getLocation(binding),
                  variableType: typeNode ? getNodeText(typeNode) : undefined
                } as VariableSymbol);
              }
            }
          }
        }
      }

      return {
        name: getNodeText(nameNode),
        type: ST.INTERFACE,
        location: getLocation(node),
        extends: inheritanceNode ? [getNodeText(inheritanceNode)] : undefined,
        members
      };
    }

    function extractImport(node: Parser.SyntaxNode): ImportSymbol | null {
      let from = '';
      const imports: string[] = [];

      // Get the module name from import statement
      for (const child of node.namedChildren) {
        if (child.type === 'identifier' || child.type === 'scoped_identifier') {
          from = getNodeText(child);
          imports.push(from);
        }
      }

      return {
        name: from,
        type: ST.IMPORT,
        location: getLocation(node),
        from,
        imports
      };
    }

    function extractVariable(node: Parser.SyntaxNode, isConst: boolean = false): VariableSymbol | null {
      const bindingNode = node.descendantsOfType('pattern_binding')[0];
      if (!bindingNode) return null;

      const patternNode = bindingNode.childForFieldName('pattern');
      const typeNode = bindingNode.childForFieldName('type');
      const valueNode = bindingNode.childForFieldName('value');

      if (!patternNode) return null;

      return {
        name: getNodeText(patternNode),
        type: isConst ? ST.CONSTANT : ST.VARIABLE,
        location: getLocation(bindingNode),
        variableType: typeNode ? getNodeText(typeNode) : undefined,
        value: valueNode ? getNodeText(valueNode) : undefined
      };
    }

    function traverse(node: Parser.SyntaxNode) {
      const isTopLevel = node.parent?.type === 'source_file';

      if (isTopLevel) {
        if (node.type === 'function_declaration') {
          const func = extractFunction(node);
          if (func) symbols.push(func);
        } else if (node.type === 'class_declaration') {
          const cls = extractClass(node);
          if (cls) symbols.push(cls);
        } else if (node.type === 'struct_declaration') {
          const struct = extractStruct(node);
          if (struct) symbols.push(struct);
        } else if (node.type === 'enum_declaration') {
          const enumDecl = extractEnum(node);
          if (enumDecl) symbols.push(enumDecl);
        } else if (node.type === 'protocol_declaration') {
          const protocol = extractProtocol(node);
          if (protocol) symbols.push(protocol);
        } else if (node.type === 'import_declaration') {
          const importDecl = extractImport(node);
          if (importDecl) symbols.push(importDecl);
        } else if (node.type === 'property_declaration') {
          const isLet = node.children.some(c => c.type === 'let');
          const variable = extractVariable(node, isLet);
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
