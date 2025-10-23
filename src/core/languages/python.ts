import type Parser from 'tree-sitter';
import type { ASTSymbol, FunctionSymbol, ClassSymbol, ImportSymbol, SourceLocation, Parameter } from '../../types/index.js';
import type { LanguageConfig } from './index.js';
import { SymbolType as ST } from '../../types/index.js';

export const PythonConfig: LanguageConfig = {
  name: 'Python',
  extensions: ['.py', '.pyi'],

  loadGrammar: async () => {
    const PythonLanguage = await import('tree-sitter-python');
    return PythonLanguage.default;
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
          if (child.type === 'identifier' || child.type === 'typed_parameter' || child.type === 'default_parameter') {
            const nameNode = child.type === 'identifier' ? child : child.childForFieldName('name') || child.children.find(c => c.type === 'identifier');
            const typeNode = child.childForFieldName('type');
            const defaultValue = child.children.find(c => c.type === 'default_parameter');

            if (nameNode && getNodeText(nameNode) !== 'self' && getNodeText(nameNode) !== 'cls') {
              params.push({
                name: getNodeText(nameNode),
                type: typeNode ? getNodeText(typeNode) : undefined,
                defaultValue: defaultValue ? getNodeText(defaultValue) : undefined
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
      const returnTypeNode = node.childForFieldName('return_type');
      const isAsync = node.type === 'async_function_definition';

      return {
        name: getNodeText(nameNode),
        type: isMethod ? ST.METHOD : ST.FUNCTION,
        location: getLocation(node),
        parameters,
        returnType: returnTypeNode ? getNodeText(returnTypeNode) : undefined,
        async: isAsync
      };
    }

    function extractClass(node: Parser.SyntaxNode): ClassSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const bodyNode = node.childForFieldName('body');
      const superclassesNode = node.childForFieldName('superclasses');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'function_definition' || child.type === 'async_function_definition') {
            const method = extractFunction(child, true);
            if (method) members.push(method);
          }
        }
      }

      return {
        name: getNodeText(nameNode),
        type: ST.CLASS,
        location: getLocation(node),
        extends: superclassesNode ? getNodeText(superclassesNode) : undefined,
        members
      };
    }

    function extractImport(node: Parser.SyntaxNode): ImportSymbol | null {
      const imports: string[] = [];
      let from: string = '';
      let namespace: string | undefined;

      if (node.type === 'import_statement') {
        for (const child of node.namedChildren) {
          if (child.type === 'dotted_name' || child.type === 'aliased_import') {
            const name = child.type === 'aliased_import' ? child.childForFieldName('name') : child;
            if (name) imports.push(getNodeText(name));
          }
        }
        from = imports[0] || '';
      } else if (node.type === 'import_from_statement') {
        const moduleNode = node.childForFieldName('module_name');
        if (moduleNode) from = getNodeText(moduleNode);

        for (const child of node.namedChildren) {
          if (child.type === 'dotted_name' || child.type === 'aliased_import') {
            const name = child.type === 'aliased_import' ? child.childForFieldName('name') : child;
            if (name) imports.push(getNodeText(name));
          } else if (child.type === 'wildcard_import') {
            namespace = '*';
          }
        }
      }

      return {
        name: from,
        type: ST.IMPORT,
        location: getLocation(node),
        from,
        imports,
        namespace
      };
    }

    function traverse(node: Parser.SyntaxNode, depth: number = 0) {
      // Only extract top-level declarations
      if (depth > 1) return;

      if (node.type === 'function_definition' || node.type === 'async_function_definition') {
        const func = extractFunction(node);
        if (func) symbols.push(func);
      } else if (node.type === 'class_definition') {
        const cls = extractClass(node);
        if (cls) symbols.push(cls);
      } else if (node.type === 'import_statement' || node.type === 'import_from_statement') {
        const importDecl = extractImport(node);
        if (importDecl) symbols.push(importDecl);
      }

      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    }

    traverse(rootNode);
    return symbols;
  }
};
