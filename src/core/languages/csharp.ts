import type Parser from 'tree-sitter';
import type { ASTSymbol, FunctionSymbol, ClassSymbol, InterfaceSymbol, StructSymbol, EnumSymbol, NamespaceSymbol, ImportSymbol, VariableSymbol, SourceLocation, Parameter } from '../../types/index.js';
import type { LanguageConfig } from './index.js';
import { SymbolType as ST } from '../../types/index.js';

export const CSharpConfig: LanguageConfig = {
  name: 'C#',
  extensions: ['.cs'],

  loadGrammar: async () => {
    const CSharpLanguage = await import('tree-sitter-c-sharp');
    return CSharpLanguage.default;
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

    function extractMethod(node: Parser.SyntaxNode): FunctionSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const parameters = extractParameters(node);
      const typeNode = node.childForFieldName('type');
      const isAsync = node.children.some(c => c.type === 'async');

      return {
        name: getNodeText(nameNode),
        type: ST.METHOD,
        location: getLocation(node),
        parameters,
        returnType: typeNode ? getNodeText(typeNode) : undefined,
        async: isAsync
      };
    }

    function extractProperty(node: Parser.SyntaxNode): VariableSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const typeNode = node.childForFieldName('type');

      return {
        name: getNodeText(nameNode),
        type: ST.VARIABLE,
        location: getLocation(node),
        variableType: typeNode ? getNodeText(typeNode) : undefined
      };
    }

    function extractClass(node: Parser.SyntaxNode): ClassSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const bodyNode = node.childForFieldName('body');
      const basesNode = node.childForFieldName('bases');
      const isAbstract = node.children.some(c => c.type === 'abstract');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'method_declaration') {
            const method = extractMethod(child);
            if (method) members.push(method);
          } else if (child.type === 'constructor_declaration') {
            const ctor = extractMethod(child);
            if (ctor) {
              ctor.name = 'constructor';
              members.push(ctor);
            }
          } else if (child.type === 'property_declaration') {
            const property = extractProperty(child);
            if (property) members.push(property);
          } else if (child.type === 'field_declaration') {
            const declarator = child.descendantsOfType('variable_declarator')[0];
            if (declarator) {
              const fieldName = declarator.childForFieldName('name');
              const typeNode = child.childForFieldName('type');
              if (fieldName) {
                members.push({
                  name: getNodeText(fieldName),
                  type: ST.VARIABLE,
                  location: getLocation(declarator),
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
        extends: basesNode ? getNodeText(basesNode) : undefined,
        members,
        abstract: isAbstract
      };
    }

    function extractInterface(node: Parser.SyntaxNode): InterfaceSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const bodyNode = node.childForFieldName('body');
      const basesNode = node.childForFieldName('bases');

      // Extract individual base interface names from bases node
      let extendsList: string[] | undefined;
      if (basesNode) {
        extendsList = basesNode.namedChildren
          .filter(child => child.type !== ',' && child.type !== 'punctuation')
          .map(child => getNodeText(child));
        if (extendsList.length === 0) extendsList = undefined;
      }

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'method_declaration') {
            const method = extractMethod(child);
            if (method) members.push(method);
          } else if (child.type === 'property_declaration') {
            const property = extractProperty(child);
            if (property) members.push(property);
          }
        }
      }

      return {
        name: getNodeText(nameNode),
        type: ST.INTERFACE,
        location: getLocation(node),
        extends: extendsList,
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
          if (child.type === 'field_declaration') {
            const declarator = child.descendantsOfType('variable_declarator')[0];
            const typeNode = child.childForFieldName('type');

            if (declarator) {
              const fieldName = declarator.childForFieldName('name');
              if (fieldName) {
                fields.push({
                  name: getNodeText(fieldName),
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
          if (child.type === 'enum_member_declaration') {
            const memberName = child.childForFieldName('name');
            const valueNode = child.childForFieldName('value');

            if (memberName) {
              members.push({
                name: getNodeText(memberName),
                value: valueNode ? getNodeText(valueNode) : undefined
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

    function extractNamespace(node: Parser.SyntaxNode): NamespaceSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const bodyNode = node.childForFieldName('body');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'class_declaration') {
            const cls = extractClass(child);
            if (cls) members.push(cls);
          } else if (child.type === 'interface_declaration') {
            const iface = extractInterface(child);
            if (iface) members.push(iface);
          }
        }
      }

      return {
        name: getNodeText(nameNode),
        type: ST.NAMESPACE,
        location: getLocation(node),
        members
      };
    }

    function extractImport(node: Parser.SyntaxNode): ImportSymbol | null {
      let from = '';
      const imports: string[] = [];

      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        from = getNodeText(nameNode);
        imports.push(from);
      }

      return {
        name: from,
        type: ST.IMPORT,
        location: getLocation(node),
        from,
        imports
      };
    }

    function traverse(node: Parser.SyntaxNode) {
      const isTopLevel = node.parent?.type === 'compilation_unit' || node.parent?.type === 'namespace_declaration';

      if (isTopLevel) {
        if (node.type === 'class_declaration') {
          const cls = extractClass(node);
          if (cls) symbols.push(cls);
        } else if (node.type === 'interface_declaration') {
          const iface = extractInterface(node);
          if (iface) symbols.push(iface);
        } else if (node.type === 'struct_declaration') {
          const struct = extractStruct(node);
          if (struct) symbols.push(struct);
        } else if (node.type === 'enum_declaration') {
          const enumDecl = extractEnum(node);
          if (enumDecl) symbols.push(enumDecl);
        } else if (node.type === 'namespace_declaration') {
          const ns = extractNamespace(node);
          if (ns) symbols.push(ns);
        } else if (node.type === 'using_directive') {
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
