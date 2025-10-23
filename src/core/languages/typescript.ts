import type Parser from 'tree-sitter';
import type { ASTSymbol, FunctionSymbol, ClassSymbol, InterfaceSymbol, TypeSymbol, EnumSymbol, VariableSymbol, ImportSymbol, ExportSymbol, SourceLocation, Parameter } from '../../types/index.js';
import type { LanguageConfig } from './index.js';
import { SymbolType as ST } from '../../types/index.js';

export const TypeScriptConfig: LanguageConfig = {
  name: 'TypeScript',
  extensions: ['.ts'],

  loadGrammar: async () => {
    const TSLanguage = await import('tree-sitter-typescript');
    return TSLanguage.typescript;
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
          if (child.type === 'required_parameter' || child.type === 'optional_parameter') {
            const nameNode = child.childForFieldName('pattern') || child.children.find(c => c.type === 'identifier');
            const typeNode = child.childForFieldName('type');
            const defaultValue = child.children.find(c => c.type === 'initializer');

            if (nameNode) {
              params.push({
                name: getNodeText(nameNode),
                type: typeNode ? getNodeText(typeNode) : undefined,
                optional: child.type === 'optional_parameter',
                defaultValue: defaultValue ? getNodeText(defaultValue) : undefined
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
      // Check for async keyword in child tokens
      const isAsync = node.children.some(c => c.type === 'async' || getNodeText(c) === 'async');
      // Check if this is a generator function by node type
      const isGenerator = node.type === 'generator_function_declaration' || node.type === 'generator_function';

      return {
        name: getNodeText(nameNode),
        type: ST.FUNCTION,
        location: getLocation(node),
        parameters,
        returnType: returnTypeNode ? getNodeText(returnTypeNode) : undefined,
        async: isAsync,
        generator: isGenerator,
        signature: getNodeText(node).split('{')[0]?.trim() || getNodeText(node)
      };
    }

    function extractClass(node: Parser.SyntaxNode): ClassSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const bodyNode = node.childForFieldName('body');

      // Extract extends and implements from class_heritage child node
      let extendsValue: string | undefined;
      let implementsList: string[] | undefined;

      for (const child of node.children) {
        if (child.type === 'class_heritage') {
          // Process extends clause
          for (const heritageChild of child.children) {
            if (heritageChild.type === 'extends_clause') {
              const valueNode = heritageChild.childForFieldName('value');
              if (valueNode) {
                extendsValue = getNodeText(valueNode);
              }
            } else if (heritageChild.type === 'implements_clause') {
              // Extract all implemented interfaces
              const interfaces: string[] = [];
              for (const implChild of heritageChild.namedChildren) {
                if (implChild.type === 'type_identifier') {
                  interfaces.push(getNodeText(implChild));
                }
              }
              if (interfaces.length > 0) {
                implementsList = interfaces;
              }
            }
          }
        }
      }

      // Check if this is an abstract class by checking for abstract keyword
      let isAbstract = false;
      for (const child of node.children) {
        if (child.type === 'abstract' || getNodeText(child) === 'abstract') {
          isAbstract = true;
          break;
        }
      }

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'method_definition') {
            const method = extractFunction(child);
            if (method) {
              method.type = ST.METHOD;
              members.push(method);
            }
          } else if (child.type === 'public_field_definition' || child.type === 'field_definition') {
            const propName = child.childForFieldName('name');
            const propType = child.childForFieldName('type');
            if (propName) {
              members.push({
                name: getNodeText(propName),
                type: ST.VARIABLE,
                location: getLocation(child),
                variableType: propType ? getNodeText(propType) : undefined
              } as VariableSymbol);
            }
          }
        }
      }

      return {
        name: getNodeText(nameNode),
        type: ST.CLASS,
        location: getLocation(node),
        extends: extendsValue,
        implements: implementsList,
        members,
        abstract: isAbstract
      };
    }

    function extractInterface(node: Parser.SyntaxNode): InterfaceSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: ASTSymbol[] = [];
      const bodyNode = node.childForFieldName('body');
      const extendsClause = node.children.find(c => c.type === 'extends_type_clause');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'method_signature' || child.type === 'property_signature') {
            const memberName = child.childForFieldName('name');
            if (memberName) {
              if (child.type === 'method_signature') {
                const params = extractParameters(child);
                const returnType = child.childForFieldName('return_type');
                members.push({
                  name: getNodeText(memberName),
                  type: ST.METHOD,
                  location: getLocation(child),
                  parameters: params,
                  returnType: returnType ? getNodeText(returnType) : undefined
                } as FunctionSymbol);
              } else {
                const propType = child.childForFieldName('type');
                members.push({
                  name: getNodeText(memberName),
                  type: ST.VARIABLE,
                  location: getLocation(child),
                  variableType: propType ? getNodeText(propType) : undefined
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
        extends: extendsClause ? [getNodeText(extendsClause)] : undefined,
        members
      };
    }

    function extractTypeAlias(node: Parser.SyntaxNode): TypeSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const valueNode = node.childForFieldName('value');

      return {
        name: getNodeText(nameNode),
        type: ST.TYPE,
        location: getLocation(node),
        definition: valueNode ? getNodeText(valueNode) : undefined
      };
    }

    function extractEnum(node: Parser.SyntaxNode): EnumSymbol | null {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) return null;

      const members: { name: string; value?: string }[] = [];
      const bodyNode = node.childForFieldName('body');

      if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
          if (child.type === 'enum_assignment') {
            const enumName = child.childForFieldName('name');
            const enumValue = child.childForFieldName('value');
            if (enumName) {
              members.push({
                name: getNodeText(enumName),
                value: enumValue ? getNodeText(enumValue) : undefined
              });
            }
          } else if (child.type === 'property_identifier') {
            members.push({ name: getNodeText(child) });
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
      const sourceNode = node.childForFieldName('source');
      if (!sourceNode) return null;

      const imports: string[] = [];
      let defaultImport: string | undefined;
      let namespace: string | undefined;

      for (const child of node.namedChildren) {
        if (child.type === 'import_clause') {
          for (const clauseChild of child.namedChildren) {
            if (clauseChild.type === 'identifier') {
              defaultImport = getNodeText(clauseChild);
            } else if (clauseChild.type === 'named_imports') {
              for (const specifier of clauseChild.namedChildren) {
                if (specifier.type === 'import_specifier') {
                  const name = specifier.childForFieldName('name');
                  if (name) imports.push(getNodeText(name));
                }
              }
            } else if (clauseChild.type === 'namespace_import') {
              const nameNode = clauseChild.children.find(c => c.type === 'identifier');
              if (nameNode) namespace = getNodeText(nameNode);
            }
          }
        }
      }

      return {
        name: sourceNode ? getNodeText(sourceNode).replace(/['"]/g, '') : '',
        type: ST.IMPORT,
        location: getLocation(node),
        from: sourceNode ? getNodeText(sourceNode).replace(/['"]/g, '') : '',
        imports,
        default: defaultImport,
        namespace
      };
    }

    function extractExport(node: Parser.SyntaxNode): ExportSymbol | null {
      const exports: string[] = [];
      let defaultExport: string | undefined;

      if (node.type === 'export_statement') {
        for (const child of node.namedChildren) {
          if (child.type === 'export_clause') {
            for (const specifier of child.namedChildren) {
              if (specifier.type === 'export_specifier') {
                const name = specifier.childForFieldName('name');
                if (name) exports.push(getNodeText(name));
              }
            }
          } else if (child.type === 'identifier') {
            exports.push(getNodeText(child));
          }
        }
      } else if (node.type === 'export_default') {
        const declaration = node.children.find(c => c.type !== 'export' && c.type !== 'default');
        if (declaration) {
          defaultExport = getNodeText(declaration);
        }
      }

      return {
        name: 'export',
        type: ST.EXPORT,
        location: getLocation(node),
        exports,
        default: defaultExport
      };
    }

    function traverse(node: Parser.SyntaxNode) {
      // Check if this node is at the top level (parent is program)
      const isTopLevel = node.parent?.type === 'program';

      // Handle export_statement specially - it wraps declarations
      if (node.type === 'export_statement') {
        // Check if this export_statement contains a declaration (e.g., export interface Foo)
        const declaration = node.namedChildren.find(child =>
          child.type === 'interface_declaration' ||
          child.type === 'class_declaration' ||
          child.type === 'abstract_class_declaration' ||
          child.type === 'function_declaration' ||
          child.type === 'type_alias_declaration' ||
          child.type === 'enum_declaration' ||
          child.type === 'lexical_declaration' ||
          child.type === 'variable_declaration'
        );

        if (declaration) {
          // Extract the declaration directly, not the export wrapper
          if (declaration.type === 'function_declaration') {
            const func = extractFunction(declaration);
            if (func) symbols.push(func);
          } else if (declaration.type === 'class_declaration' || declaration.type === 'abstract_class_declaration') {
            const cls = extractClass(declaration);
            if (cls) symbols.push(cls);
          } else if (declaration.type === 'interface_declaration') {
            const iface = extractInterface(declaration);
            if (iface) symbols.push(iface);
          } else if (declaration.type === 'type_alias_declaration') {
            const typeAlias = extractTypeAlias(declaration);
            if (typeAlias) symbols.push(typeAlias);
          } else if (declaration.type === 'enum_declaration') {
            const enumDecl = extractEnum(declaration);
            if (enumDecl) symbols.push(enumDecl);
          } else if (declaration.type === 'lexical_declaration' || declaration.type === 'variable_declaration') {
            // Extract variables/constants from the declaration, checking if they're functions
            for (const child of declaration.namedChildren) {
              if (child.type === 'variable_declarator') {
                const nameNode = child.childForFieldName('name');
                const typeNode = child.childForFieldName('type');
                const valueNode = child.childForFieldName('value');
                if (nameNode && valueNode) {
                  // Check if the value is a function (arrow function or function expression)
                  const isFunctionValue = valueNode.type === 'arrow_function' ||
                                         valueNode.type === 'function' ||
                                         valueNode.type === 'function_expression' ||
                                         valueNode.type === 'generator_function';

                  if (isFunctionValue) {
                    // Extract as a function symbol
                    const parameters = extractParameters(valueNode);
                    const returnTypeNode = valueNode.childForFieldName('return_type');
                    const isAsync = valueNode.children.some(c => c.type === 'async' || getNodeText(c) === 'async');
                    const isGenerator = valueNode.type === 'generator_function';

                    symbols.push({
                      name: getNodeText(nameNode),
                      type: ST.FUNCTION,
                      location: getLocation(child),
                      parameters,
                      returnType: returnTypeNode ? getNodeText(returnTypeNode) : typeNode ? getNodeText(typeNode) : undefined,
                      async: isAsync,
                      generator: isGenerator
                    } as FunctionSymbol);
                  } else {
                    // Extract as a variable/constant
                    symbols.push({
                      name: getNodeText(nameNode),
                      type: declaration.type === 'lexical_declaration' && getNodeText(declaration).startsWith('const') ? ST.CONSTANT : ST.VARIABLE,
                      location: getLocation(child),
                      variableType: typeNode ? getNodeText(typeNode) : undefined,
                      value: valueNode ? getNodeText(valueNode) : undefined
                    } as VariableSymbol);
                  }
                }
              }
            }
          }
          // Don't process this export_statement further since we extracted its declaration
          return;
        } else {
          // This is a re-export statement like "export { foo, bar }" or "export * from 'module'"
          // Only extract these if they actually have content
          const exportDecl = extractExport(node);
          if (exportDecl && (exportDecl.exports.length > 0 || exportDecl.default)) {
            symbols.push(exportDecl);
          }
          return;
        }
      }

      // Handle export_default separately
      if (node.type === 'export_default') {
        const exportDecl = extractExport(node);
        if (exportDecl) symbols.push(exportDecl);
        return;
      }

      // Extract top-level declarations only
      if (isTopLevel) {
        if (node.type === 'function_declaration' || node.type === 'function') {
          const func = extractFunction(node);
          if (func) symbols.push(func);
        } else if (node.type === 'class_declaration' || node.type === 'class' || node.type === 'abstract_class_declaration') {
          const cls = extractClass(node);
          if (cls) symbols.push(cls);
        } else if (node.type === 'interface_declaration') {
          const iface = extractInterface(node);
          if (iface) symbols.push(iface);
        } else if (node.type === 'type_alias_declaration') {
          const typeAlias = extractTypeAlias(node);
          if (typeAlias) symbols.push(typeAlias);
        } else if (node.type === 'enum_declaration') {
          const enumDecl = extractEnum(node);
          if (enumDecl) symbols.push(enumDecl);
        } else if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
          // Extract top-level variables/constants, checking if they're functions
          for (const child of node.namedChildren) {
            if (child.type === 'variable_declarator') {
              const nameNode = child.childForFieldName('name');
              const typeNode = child.childForFieldName('type');
              const valueNode = child.childForFieldName('value');
              if (nameNode && valueNode) {
                // Check if the value is a function (arrow function or function expression)
                const isFunctionValue = valueNode.type === 'arrow_function' ||
                                       valueNode.type === 'function' ||
                                       valueNode.type === 'function_expression' ||
                                       valueNode.type === 'generator_function';

                if (isFunctionValue) {
                  // Extract as a function symbol
                  const parameters = extractParameters(valueNode);
                  const returnTypeNode = valueNode.childForFieldName('return_type');
                  const isAsync = valueNode.children.some(c => c.type === 'async' || getNodeText(c) === 'async');
                  const isGenerator = valueNode.type === 'generator_function';

                  symbols.push({
                    name: getNodeText(nameNode),
                    type: ST.FUNCTION,
                    location: getLocation(child),
                    parameters,
                    returnType: returnTypeNode ? getNodeText(returnTypeNode) : typeNode ? getNodeText(typeNode) : undefined,
                    async: isAsync,
                    generator: isGenerator
                  } as FunctionSymbol);
                } else {
                  // Extract as a variable/constant
                  symbols.push({
                    name: getNodeText(nameNode),
                    type: node.type === 'lexical_declaration' && getNodeText(node).startsWith('const') ? ST.CONSTANT : ST.VARIABLE,
                    location: getLocation(child),
                    variableType: typeNode ? getNodeText(typeNode) : undefined,
                    value: valueNode ? getNodeText(valueNode) : undefined
                  } as VariableSymbol);
                }
              }
            }
          }
        }
      }

      // Import statements
      if (node.type === 'import_statement') {
        const importDecl = extractImport(node);
        if (importDecl) symbols.push(importDecl);
      }

      // Continue traversing for nested structures
      for (const child of node.children) {
        traverse(child);
      }
    }

    traverse(rootNode);
    return symbols;
  }
};

export const TSXConfig: LanguageConfig = {
  name: 'TypeScript JSX',
  extensions: ['.tsx'],

  loadGrammar: async () => {
    const TSLanguage = await import('tree-sitter-typescript');
    return TSLanguage.tsx;
  },

  extractSymbols: TypeScriptConfig.extractSymbols
};
