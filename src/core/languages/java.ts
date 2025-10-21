import type Parser from 'tree-sitter';
import type { ASTSymbol, FunctionSymbol, ClassSymbol, InterfaceSymbol, EnumSymbol, ImportSymbol, VariableSymbol, SourceLocation, Parameter } from '../../types/index.js';
import type { LanguageConfig } from './index.js';
import { SymbolType as ST } from '../../types/index.js';

export const JavaConfig: LanguageConfig = {
  name: 'Java',
  extensions: ['.java'],

  loadGrammar: async () => {
    const JavaLanguage = await import('tree-sitter-java');
    return JavaLanguage.default;
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
      const formalParams = node.childForFieldName('parameters');

      if (formalParams) {
        for (const child of formalParams.namedChildren) {
          if (child.type === 'formal_parameter') {
            const nameNode = child.childForFieldName('name');
            const typeNode = child.childForFieldName('type');

            if (nameNode) {
              params.push({
                name: getNodeText(nameNode),
                type: typeNode ? getNodeText(typeNode) : undefined
              });
            }
          } else if (child.type === 'spread_parameter') {
            const nameNode = child.childForFieldName('name');
            const typeNode = child.childForFieldName('type');

            if (nameNode) {
              params.push({
                name: `...${getNodeText(nameNode)}`,
                type: typeNode ? getNodeText(typeNode) + '...' : undefined
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

      return {
        name: getNodeText(nameNode),
        type: ST.METHOD,
        location: getLocation(node),
        parameters,
        returnType: typeNode ? getNodeText(typeNode) : 'void'
      };
    }

    function extractClass(node: Parser.SyntaxNode): ClassSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const bodyNode = node.childForFieldName('body');
      const superclassNode = node.childForFieldName('superclass');
      const interfacesNode = node.childForFieldName('interfaces');
      const isAbstract = node.children.some(c => c.type === 'modifiers' && getNodeText(c).includes('abstract'));

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'method_declaration') {
            const method = extractMethod(child);
            if (method) members.push(method);
          } else if (child.type === 'constructor_declaration') {
            const constructor = extractMethod(child);
            if (constructor) {
              constructor.name = 'constructor';
              members.push(constructor);
            }
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
        extends: superclassNode ? getNodeText(superclassNode) : undefined,
        implements: interfacesNode ? [getNodeText(interfacesNode)] : undefined,
        members,
        abstract: isAbstract
      };
    }

    function extractInterface(node: Parser.SyntaxNode): InterfaceSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const bodyNode = node.childForFieldName('body');
      const extendsNode = node.childForFieldName('extends');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'method_declaration') {
            const method = extractMethod(child);
            if (method) members.push(method);
          } else if (child.type === 'constant_declaration') {
            const declarator = child.descendantsOfType('variable_declarator')[0];
            if (declarator) {
              const constName = declarator.childForFieldName('name');
              const typeNode = child.childForFieldName('type');
              if (constName) {
                members.push({
                  name: getNodeText(constName),
                  type: ST.CONSTANT,
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
        type: ST.INTERFACE,
        location: getLocation(node),
        extends: extendsNode ? [getNodeText(extendsNode)] : undefined,
        members
      };
    }

    function extractEnum(node: Parser.SyntaxNode): EnumSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: { name: string; value?: string }[] = [];
      const bodyNode = node.childForFieldName('body');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'enum_constant') {
            const constantName = child.childForFieldName('name');
            if (constantName) {
              members.push({
                name: getNodeText(constantName)
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

    function extractImport(node: Parser.SyntaxNode): ImportSymbol | null {
      let from = '';
      const imports: string[] = [];

      // Get the full import path
      for (const child of node.namedChildren) {
        if (child.type === 'scoped_identifier' || child.type === 'identifier') {
          from = getNodeText(child);
          // Extract the last part as the imported name
          const parts = from.split('.');
          const lastPart = parts[parts.length - 1];
          if (lastPart) {
            imports.push(lastPart);
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

    function traverse(node: Parser.SyntaxNode) {
      const isTopLevel = node.parent?.type === 'program';

      if (isTopLevel) {
        if (node.type === 'class_declaration') {
          const cls = extractClass(node);
          if (cls) symbols.push(cls);
        } else if (node.type === 'interface_declaration') {
          const iface = extractInterface(node);
          if (iface) symbols.push(iface);
        } else if (node.type === 'enum_declaration') {
          const enumDecl = extractEnum(node);
          if (enumDecl) symbols.push(enumDecl);
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
