import type Parser from 'tree-sitter';
import type { ASTSymbol, FunctionSymbol, InterfaceSymbol, StructSymbol, ImportSymbol, VariableSymbol, SourceLocation, Parameter } from '../../types/index.js';
import type { LanguageConfig } from './index.js';
import { SymbolType as ST } from '../../types/index.js';

export const GoConfig: LanguageConfig = {
  name: 'Go',
  extensions: ['.go'],

  loadGrammar: async () => {
    const GoLanguage = await import('tree-sitter-go');
    return GoLanguage.default;
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
      const paramList = node.childForFieldName('parameters');

      if (paramList) {
        for (const child of paramList.namedChildren) {
          if (child.type === 'parameter_declaration') {
            const nameNode = child.childForFieldName('name');
            const typeNode = child.childForFieldName('type');

            if (nameNode) {
              params.push({
                name: getNodeText(nameNode),
                type: typeNode ? getNodeText(typeNode) : undefined
              });
            }
          }
        }
      }

      return params;
    }

    function extractFunction(node: Parser.SyntaxNode, isMethod: boolean = false): FunctionSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const parameters = extractParameters(node);
      const resultNode = node.childForFieldName('result');

      return {
        name: getNodeText(nameNode),
        type: isMethod ? ST.METHOD : ST.FUNCTION,
        location: getLocation(node),
        parameters,
        returnType: resultNode ? getNodeText(resultNode) : undefined
      };
    }

    function extractMethod(node: Parser.SyntaxNode): FunctionSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const receiverNode = node.childForFieldName('receiver');
      const parameters = extractParameters(node);
      const resultNode = node.childForFieldName('result');

      return {
        name: getNodeText(nameNode),
        type: ST.METHOD,
        location: getLocation(node),
        parameters,
        returnType: resultNode ? getNodeText(resultNode) : undefined,
        signature: receiverNode ? `func ${getNodeText(receiverNode)} ${getNodeText(nameNode)}` : undefined
      };
    }

    function extractStruct(node: Parser.SyntaxNode): StructSymbol | null {
      const nameNode = node.childForFieldName('name');
      const typeNode = node.childForFieldName('type');

      if (!nameNode || !typeNode || typeNode.type !== 'struct_type') return null;

      const fields: { name: string; type?: string }[] = [];
      const fieldDeclList = typeNode.childForFieldName('field_declaration_list');

      if (fieldDeclList) {
        for (const child of fieldDeclList.namedChildren) {
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

    function extractInterface(node: Parser.SyntaxNode): InterfaceSymbol | null {
      const nameNode = node.childForFieldName('name');
      const typeNode = node.childForFieldName('type');

      if (!nameNode || !typeNode || typeNode.type !== 'interface_type') return null;

      const members: ASTSymbol[] = [];
      const methodSpecList = typeNode.childForFieldName('method_spec_list');

      if (methodSpecList) {
        for (const child of methodSpecList.namedChildren) {
          if (child.type === 'method_spec') {
            const methodName = child.childForFieldName('name');
            const params = extractParameters(child);
            const result = child.childForFieldName('result');

            if (methodName) {
              members.push({
                name: getNodeText(methodName),
                type: ST.METHOD,
                location: getLocation(child),
                parameters: params,
                returnType: result ? getNodeText(result) : undefined
              } as FunctionSymbol);
            }
          }
        }
      }

      return {
        name: getNodeText(nameNode),
        type: ST.INTERFACE,
        location: getLocation(node),
        members
      };
    }

    function extractImport(node: Parser.SyntaxNode): ImportSymbol | null {
      const imports: string[] = [];
      let from = '';

      if (node.type === 'import_declaration') {
        for (const child of node.namedChildren) {
          if (child.type === 'import_spec') {
            const pathNode = child.childForFieldName('path');
            if (pathNode) {
              const path = getNodeText(pathNode).replace(/['"]/g, '');
              imports.push(path);
              if (!from) from = path;
            }
          } else if (child.type === 'import_spec_list') {
            for (const spec of child.namedChildren) {
              if (spec.type === 'import_spec') {
                const pathNode = spec.childForFieldName('path');
                if (pathNode) {
                  const path = getNodeText(pathNode).replace(/['"]/g, '');
                  imports.push(path);
                }
              }
            }
          }
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
        if (node.type === 'function_declaration') {
          const func = extractFunction(node);
          if (func) symbols.push(func);
        } else if (node.type === 'method_declaration') {
          const method = extractMethod(node);
          if (method) symbols.push(method);
        } else if (node.type === 'type_declaration') {
          const typeNode = node.childForFieldName('type');
          if (typeNode?.type === 'struct_type') {
            const struct = extractStruct(node);
            if (struct) symbols.push(struct);
          } else if (typeNode?.type === 'interface_type') {
            const iface = extractInterface(node);
            if (iface) symbols.push(iface);
          }
        } else if (node.type === 'const_declaration') {
          for (const child of node.namedChildren) {
            if (child.type === 'const_spec') {
              const variable = extractVariable(child, true);
              if (variable) symbols.push(variable);
            }
          }
        } else if (node.type === 'var_declaration') {
          for (const child of node.namedChildren) {
            if (child.type === 'var_spec') {
              const variable = extractVariable(child, false);
              if (variable) symbols.push(variable);
            }
          }
        } else if (node.type === 'import_declaration') {
          const importDecl = extractImport(node);
          if (importDecl) symbols.push(importDecl);
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
