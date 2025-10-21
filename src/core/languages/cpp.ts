import type Parser from 'tree-sitter';
import type { ASTSymbol, FunctionSymbol, ClassSymbol, StructSymbol, EnumSymbol, NamespaceSymbol, ImportSymbol, VariableSymbol, SourceLocation, Parameter } from '../../types/index.js';
import type { LanguageConfig } from './index.js';
import { SymbolType as ST } from '../../types/index.js';

export const CppConfig: LanguageConfig = {
  name: 'C++',
  extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.h', '.hxx'],

  loadGrammar: async () => {
    const CppLanguage = await import('tree-sitter-cpp');
    return CppLanguage.default;
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
            const declaratorNode = child.childForFieldName('declarator');
            const typeNode = child.childForFieldName('type');

            if (declaratorNode) {
              const name = declaratorNode.type === 'identifier' ? getNodeText(declaratorNode) :
                           declaratorNode.childForFieldName('declarator') ?
                           getNodeText(declaratorNode.childForFieldName('declarator')!) :
                           getNodeText(declaratorNode);

              params.push({
                name,
                type: typeNode ? getNodeText(typeNode) : undefined
              });
            }
          }
        }
      }

      return params;
    }

    function extractFunction(node: Parser.SyntaxNode): FunctionSymbol | null {
      const declaratorNode = node.childForFieldName('declarator');
      if (!declaratorNode) return null;

      let nameNode = declaratorNode.childForFieldName('declarator');
      if (!nameNode || nameNode.type === 'function_declarator') {
        nameNode = declaratorNode;
      }

      // Get the function name
      let functionName = '';
      if (nameNode.type === 'function_declarator') {
        const innerDecl = nameNode.childForFieldName('declarator');
        if (innerDecl) {
          functionName = getNodeText(innerDecl);
        }
      } else {
        functionName = getNodeText(nameNode);
      }

      if (!functionName) return null;

      const parameters = extractParameters(declaratorNode);
      const typeNode = node.childForFieldName('type');

      return {
        name: functionName,
        type: ST.FUNCTION,
        location: getLocation(node),
        parameters,
        returnType: typeNode ? getNodeText(typeNode) : undefined
      };
    }

    function extractClass(node: Parser.SyntaxNode): ClassSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const bodyNode = node.childForFieldName('body');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'function_definition') {
            const method = extractFunction(child);
            if (method) {
              method.type = ST.METHOD;
              members.push(method);
            }
          } else if (child.type === 'field_declaration') {
            const declarator = child.descendantsOfType('field_identifier')[0];
            if (declarator) {
              members.push({
                name: getNodeText(declarator),
                type: ST.VARIABLE,
                location: getLocation(child)
              } as VariableSymbol);
            }
          }
        }
      }

      return {
        name: getNodeText(nameNode),
        type: ST.CLASS,
        location: getLocation(node),
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
            const declarator = child.descendantsOfType('field_identifier')[0];
            const typeNode = child.childForFieldName('type');

            if (declarator) {
              fields.push({
                name: getNodeText(declarator),
                type: typeNode ? getNodeText(typeNode) : undefined
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
          if (child.type === 'enumerator') {
            const enumName = child.childForFieldName('name');
            const enumValue = child.childForFieldName('value');

            if (enumName) {
              members.push({
                name: getNodeText(enumName),
                value: enumValue ? getNodeText(enumValue) : undefined
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
          if (child.type === 'function_definition') {
            const func = extractFunction(child);
            if (func) members.push(func);
          } else if (child.type === 'class_specifier') {
            const cls = extractClass(child);
            if (cls) members.push(cls);
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
      const text = getNodeText(node);
      const imports: string[] = [];

      // Extract the include path from #include statements
      const match = text.match(/#include\s*[<"]([^>"]+)[>"]/);
      if (!match || !match[1]) return null;

      const from = match[1];
      imports.push(from);

      return {
        name: from,
        type: ST.IMPORT,
        location: getLocation(node),
        from,
        imports
      };
    }

    function traverse(node: Parser.SyntaxNode) {
      const isTopLevel = node.parent?.type === 'translation_unit';

      if (isTopLevel) {
        if (node.type === 'function_definition') {
          const func = extractFunction(node);
          if (func) symbols.push(func);
        } else if (node.type === 'class_specifier') {
          const cls = extractClass(node);
          if (cls) symbols.push(cls);
        } else if (node.type === 'struct_specifier') {
          const struct = extractStruct(node);
          if (struct) symbols.push(struct);
        } else if (node.type === 'enum_specifier') {
          const enumDecl = extractEnum(node);
          if (enumDecl) symbols.push(enumDecl);
        } else if (node.type === 'namespace_definition') {
          const ns = extractNamespace(node);
          if (ns) symbols.push(ns);
        } else if (node.type === 'preproc_include') {
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
