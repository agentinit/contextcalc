import type Parser from 'tree-sitter';
import type { ASTSymbol, FunctionSymbol, ClassSymbol, ImportSymbol, VariableSymbol, SourceLocation, Parameter } from '../../types/index.js';
import type { LanguageConfig } from './index.js';
import { SymbolType as ST } from '../../types/index.js';

export const RubyConfig: LanguageConfig = {
  name: 'Ruby',
  extensions: ['.rb'],

  loadGrammar: async () => {
    const RubyLanguage = await import('tree-sitter-ruby');
    return RubyLanguage.default;
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
          if (child.type === 'identifier' || child.type === 'optional_parameter' || child.type === 'keyword_parameter') {
            const name = child.type === 'identifier' ? getNodeText(child) :
                         child.childForFieldName('name') ? getNodeText(child.childForFieldName('name')!) :
                         getNodeText(child);

            const defaultValue = child.childForFieldName('value');

            params.push({
              name,
              defaultValue: defaultValue ? getNodeText(defaultValue) : undefined
            });
          }
        }
      }

      return params;
    }

    function extractMethod(node: Parser.SyntaxNode): FunctionSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const parameters = extractParameters(node);

      return {
        name: getNodeText(nameNode),
        type: ST.METHOD,
        location: getLocation(node),
        parameters
      };
    }

    function extractClass(node: Parser.SyntaxNode): ClassSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const superclassNode = node.childForFieldName('superclass');

      // Extract methods from the class body
      for (const child of node.descendantsOfType('method')) {
        const method = extractMethod(child);
        if (method) members.push(method);
      }

      // Extract instance variables
      for (const child of node.descendantsOfType('instance_variable')) {
        const varName = getNodeText(child);
        if (varName) {
          members.push({
            name: varName,
            type: ST.VARIABLE,
            location: getLocation(child)
          } as VariableSymbol);
        }
      }

      return {
        name: getNodeText(nameNode),
        type: ST.CLASS,
        location: getLocation(node),
        extends: superclassNode ? getNodeText(superclassNode) : undefined,
        members
      };
    }

    function extractModule(node: Parser.SyntaxNode): ClassSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];

      // Extract methods from the module body
      for (const child of node.descendantsOfType('method')) {
        const method = extractMethod(child);
        if (method) members.push(method);
      }

      return {
        name: getNodeText(nameNode),
        type: ST.CLASS, // Use CLASS type for modules as they're similar
        location: getLocation(node),
        members
      };
    }

    function extractRequire(node: Parser.SyntaxNode): ImportSymbol | null {
      // Look for method calls with 'require' or 'require_relative'
      const methodNode = node.childForFieldName('method');
      if (!methodNode) return null;

      const methodName = getNodeText(methodNode);
      if (methodName !== 'require' && methodName !== 'require_relative' && methodName !== 'include') {
        return null;
      }

      const args = node.childForFieldName('arguments');
      let from = '';

      if (args) {
        const stringNode = args.namedChildren[0];
        if (stringNode) {
          from = getNodeText(stringNode).replace(/['"]/g, '');
        }
      }

      return {
        name: from,
        type: ST.IMPORT,
        location: getLocation(node),
        from,
        imports: [from]
      };
    }

    function extractConstant(node: Parser.SyntaxNode): VariableSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode || nameNode.type !== 'constant') return null;

      const valueNode = node.childForFieldName('value');

      return {
        name: getNodeText(nameNode),
        type: ST.CONSTANT,
        location: getLocation(node),
        value: valueNode ? getNodeText(valueNode) : undefined
      };
    }

    function traverse(node: Parser.SyntaxNode) {
      const isTopLevel = node.parent?.type === 'program';

      if (isTopLevel) {
        if (node.type === 'method') {
          const method = extractMethod(node);
          if (method) {
            method.type = ST.FUNCTION; // Top-level methods are functions
            symbols.push(method);
          }
        } else if (node.type === 'class') {
          const cls = extractClass(node);
          if (cls) symbols.push(cls);
        } else if (node.type === 'module') {
          const mod = extractModule(node);
          if (mod) symbols.push(mod);
        } else if (node.type === 'call') {
          const requireDecl = extractRequire(node);
          if (requireDecl) symbols.push(requireDecl);
        } else if (node.type === 'assignment') {
          const constant = extractConstant(node);
          if (constant) symbols.push(constant);
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
