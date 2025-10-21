import type Parser from 'tree-sitter';
import type { ASTSymbol, FunctionSymbol, ClassSymbol, InterfaceSymbol, TraitSymbol, NamespaceSymbol, ImportSymbol, VariableSymbol, SourceLocation, Parameter } from '../../types/index.js';
import type { LanguageConfig } from './index.js';
import { SymbolType as ST } from '../../types/index.js';

export const PhpConfig: LanguageConfig = {
  name: 'PHP',
  extensions: ['.php'],

  loadGrammar: async () => {
    const PhpLanguage = await import('tree-sitter-php');
    return PhpLanguage.php;
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
          if (child.type === 'simple_parameter' || child.type === 'property_promotion_parameter') {
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
          } else if (child.type === 'variadic_parameter') {
            const nameNode = child.childForFieldName('name');
            if (nameNode) {
              params.push({
                name: `...${getNodeText(nameNode)}`
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
      const returnTypeNode = node.childForFieldName('return_type');

      return {
        name: getNodeText(nameNode),
        type: ST.FUNCTION,
        location: getLocation(node),
        parameters,
        returnType: returnTypeNode ? getNodeText(returnTypeNode) : undefined
      };
    }

    function extractMethod(node: Parser.SyntaxNode): FunctionSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const parameters = extractParameters(node);
      const returnTypeNode = node.childForFieldName('return_type');

      return {
        name: getNodeText(nameNode),
        type: ST.METHOD,
        location: getLocation(node),
        parameters,
        returnType: returnTypeNode ? getNodeText(returnTypeNode) : undefined
      };
    }

    function extractClass(node: Parser.SyntaxNode): ClassSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const bodyNode = node.childForFieldName('body');
      const baseClauseNode = node.childForFieldName('base_clause');
      const interfacesNode = node.childForFieldName('interface_clause');
      const isAbstract = node.children.some(c => c.type === 'abstract_modifier');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'method_declaration') {
            const method = extractMethod(child);
            if (method) members.push(method);
          } else if (child.type === 'property_declaration') {
            for (const propDecl of child.descendantsOfType('property_element')) {
              const propName = propDecl.childForFieldName('name');
              if (propName) {
                members.push({
                  name: getNodeText(propName),
                  type: ST.VARIABLE,
                  location: getLocation(propDecl)
                } as VariableSymbol);
              }
            }
          } else if (child.type === 'const_declaration') {
            for (const constDecl of child.descendantsOfType('const_element')) {
              const constName = constDecl.childForFieldName('name');
              const valueNode = constDecl.childForFieldName('value');
              if (constName) {
                members.push({
                  name: getNodeText(constName),
                  type: ST.CONSTANT,
                  location: getLocation(constDecl),
                  value: valueNode ? getNodeText(valueNode) : undefined
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
        extends: baseClauseNode ? getNodeText(baseClauseNode) : undefined,
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
      const baseClauseNode = node.childForFieldName('base_clause');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'method_declaration') {
            const method = extractMethod(child);
            if (method) members.push(method);
          }
        }
      }

      return {
        name: getNodeText(nameNode),
        type: ST.INTERFACE,
        location: getLocation(node),
        extends: baseClauseNode ? [getNodeText(baseClauseNode)] : undefined,
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
          if (child.type === 'method_declaration') {
            const method = extractMethod(child);
            if (method) members.push(method);
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
          } else if (child.type === 'function_definition') {
            const func = extractFunction(child);
            if (func) members.push(func);
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

    function extractUse(node: Parser.SyntaxNode): ImportSymbol | null {
      const imports: string[] = [];
      let from = '';

      // Extract use clauses
      for (const child of node.namedChildren) {
        if (child.type === 'namespace_use_clause') {
          const nameNode = child.childForFieldName('name');
          if (nameNode) {
            const name = getNodeText(nameNode);
            imports.push(name);
            if (!from) from = name;
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
      const isTopLevel = node.parent?.type === 'program' || node.parent?.type === 'namespace_definition';

      if (isTopLevel) {
        if (node.type === 'function_definition') {
          const func = extractFunction(node);
          if (func) symbols.push(func);
        } else if (node.type === 'class_declaration') {
          const cls = extractClass(node);
          if (cls) symbols.push(cls);
        } else if (node.type === 'interface_declaration') {
          const iface = extractInterface(node);
          if (iface) symbols.push(iface);
        } else if (node.type === 'trait_declaration') {
          const trait = extractTrait(node);
          if (trait) symbols.push(trait);
        } else if (node.type === 'namespace_definition') {
          const ns = extractNamespace(node);
          if (ns) symbols.push(ns);
        } else if (node.type === 'namespace_use_declaration') {
          const useDecl = extractUse(node);
          if (useDecl) symbols.push(useDecl);
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
