function unwrapDeclaration(node) {
  if (node && node.type === 'ExportNamedDeclaration' && node.declaration) {
    return node.declaration;
  }

  return node;
}

function isControlFlow(node) {
  if (!node) return false;

  return [
    'IfStatement',
    'ForStatement',
    'ForInStatement',
    'ForOfStatement',
    'WhileStatement',
    'DoWhileStatement',
    'SwitchStatement',
    'TryStatement',
  ].includes(node.type);
}

function isIgnoredBoundary(node) {
  if (!node) return false;

  return ['BreakStatement', 'ContinueStatement', 'DebuggerStatement', 'EmptyStatement'].includes(
    node.type,
  );
}

function checkStatements(context, statements) {
  if (!statements || statements.length < 2) return;

  const sourceCode = context.sourceCode || context.getSourceCode();

  for (let i = 0; i < statements.length - 1; i++) {
    const prev = statements[i];
    const next = statements[i + 1];

    if (isIgnoredBoundary(next) || isIgnoredBoundary(prev)) continue;

    const comments = sourceCode.getCommentsBefore ? sourceCode.getCommentsBefore(next) : [];
    const firstNodeOrComment = comments.length > 0 ? comments[0] : next;
    const nextLoc = firstNodeOrComment.loc || sourceCode.getLoc(firstNodeOrComment);
    const prevLoc = prev.loc || sourceCode.getLoc(prev);

    if (!nextLoc || !prevLoc) continue;

    const nextStartLine = nextLoc.start.line;
    const prevEndLine = prevLoc.end.line;

    // Check if there is already an empty line between prev and next
    if (nextStartLine - prevEndLine >= 2) {
      continue;
    }

    const prevUnwrapped = unwrapDeclaration(prev);
    const nextUnwrapped = unwrapDeclaration(next);

    const isPrevVar = prevUnwrapped.type === 'VariableDeclaration';
    const isNextVar = nextUnwrapped.type === 'VariableDeclaration';
    const isNextReturn = nextUnwrapped.type === 'ReturnStatement';

    let reason = null;

    if (isNextReturn) {
      reason = 'Expected empty line before return statement.';
    } else if (isPrevVar && !isNextVar) {
      reason = 'Expected empty line between variable declarations and subsequent logic blocks.';
    } else if (isControlFlow(prevUnwrapped) || isControlFlow(nextUnwrapped)) {
      reason = 'Expected empty line to separate control flow / condition blocks.';
    }

    if (reason) {
      context.report({
        node: next,
        message: reason,
        fix(fixer) {
          return fixer.insertTextBefore(firstNodeOrComment, '\n');
        },
      });
    }
  }
}

function isPureLiteral(expr) {
  if (!expr) return false;

  if (expr.type === 'Literal') {
    return true;
  }

  if (
    expr.type === 'Identifier' &&
    (expr.name === 'undefined' || expr.name === 'NaN' || expr.name === 'Infinity')
  ) {
    return true;
  }

  if (
    expr.type === 'UnaryExpression' &&
    (expr.operator === '-' || expr.operator === '+' || expr.operator === 'void')
  ) {
    return isPureLiteral(expr.argument);
  }

  if (expr.type === 'ArrayExpression') {
    return expr.elements.every(
      (el) => el !== null && el.type !== 'SpreadElement' && isPureLiteral(el),
    );
  }

  if (expr.type === 'ObjectExpression') {
    return expr.properties.every(
      (p) =>
        p.type === 'Property' &&
        !p.computed &&
        (p.key.type === 'Identifier' || p.key.type === 'Literal') &&
        isPureLiteral(p.value),
    );
  }

  return false;
}

function isSafeToReorder(sourceCode, node, properties) {
  // 1. If any comments exist inside the destructuring pattern, do not auto-fix to avoid deleting comments
  if (sourceCode.getCommentsInside && sourceCode.getCommentsInside(node).length > 0) {
    return false;
  }

  for (const prop of properties) {
    // 2. Do not auto-fix if RestElement (...rest) is present
    if (prop.type === 'RestElement') {
      return false;
    }

    // 3. Do not auto-fix if property key is computed (e.g. [KEY])
    if (prop.computed) {
      return false;
    }

    // 4. Must be standard Property
    if (prop.type !== 'Property') {
      return false;
    }

    // 5. Default properties: must be simple AssignmentPattern with pure literal value
    if (prop.value && prop.value.type === 'AssignmentPattern') {
      if (prop.value.left.type !== 'Identifier') {
        return false;
      }

      if (!isPureLiteral(prop.value.right)) {
        return false;
      }
    } else {
      // 6. Non-default properties: must be simple identifier (no nested patterns like { user: { name } })
      if (prop.value && prop.value.type !== 'Identifier') {
        return false;
      }
    }
  }

  return true;
}

function checkObjectPattern(context, node) {
  const sourceCode = context.sourceCode || context.getSourceCode();
  const properties = node.properties;

  if (!properties || properties.length < 2) return;

  let seenDefault = false;
  const misplacedProps = [];

  for (const prop of properties) {
    if (prop.type === 'RestElement') continue;

    const hasDefault = prop.value && prop.value.type === 'AssignmentPattern';

    if (hasDefault) {
      seenDefault = true;
    } else if (seenDefault) {
      misplacedProps.push(prop);
    }
  }

  if (misplacedProps.length === 0) return;

  const canAutofix = isSafeToReorder(sourceCode, node, properties);

  if (canAutofix) {
    const firstMisplaced = misplacedProps[0];
    const propName =
      (firstMisplaced.key && (firstMisplaced.key.name || firstMisplaced.key.value)) ||
      sourceCode.getText(firstMisplaced);

    context.report({
      node: firstMisplaced,
      message: `Props without default values ('${propName}') must be declared before props with default values.`,
      fix(fixer) {
        const nonDefaults = [];
        const defaults = [];

        for (const p of properties) {
          if (p.value && p.value.type === 'AssignmentPattern') {
            defaults.push(sourceCode.getText(p));
          } else {
            nonDefaults.push(sourceCode.getText(p));
          }
        }

        const firstProp = properties[0];
        const lastProp = properties[properties.length - 1];
        const isMultiline = firstProp.loc.start.line !== lastProp.loc.end.line;

        let reordered;

        if (isMultiline) {
          const lineText = sourceCode.lines[firstProp.loc.start.line - 1] || '';
          const indentMatch = lineText.match(/^\s*/);
          const indent = indentMatch ? indentMatch[0] : '  ';

          reordered = [...nonDefaults, ...defaults].join(`,\n${indent}`);
        } else {
          reordered = [...nonDefaults, ...defaults].join(', ');
        }

        return fixer.replaceTextRange([firstProp.range[0], lastProp.range[1]], reordered);
      },
    });

    for (let i = 1; i < misplacedProps.length; i++) {
      const prop = misplacedProps[i];
      const name = (prop.key && (prop.key.name || prop.key.value)) || sourceCode.getText(prop);

      context.report({
        node: prop,
        message: `Props without default values ('${name}') must be declared before props with default values.`,
      });
    }
  } else {
    // If not safe to reorder, report all misplaced props without fix (report-only)
    for (const prop of misplacedProps) {
      const name = (prop.key && (prop.key.name || prop.key.value)) || sourceCode.getText(prop);

      context.report({
        node: prop,
        message: `Props without default values ('${name}') must be declared before props with default values.`,
      });
    }
  }
}

function checkParams(context, params) {
  if (!params) return;

  for (const param of params) {
    if (param.type === 'ObjectPattern') {
      checkObjectPattern(context, param);
    } else if (param.type === 'AssignmentPattern' && param.left.type === 'ObjectPattern') {
      checkObjectPattern(context, param.left);
    }
  }
}

export default {
  meta: {
    name: 'universe',
    version: '1.1.0',
  },
  rules: {
    'vertical-spacing': {
      meta: {
        type: 'layout',
        fixable: 'whitespace',
        docs: {
          description:
            'Require vertical spacing between variable declarations, control blocks, and before return statements.',
        },
        messages: {},
      },
      create(context) {
        return {
          Program(node) {
            checkStatements(context, node.body);
          },
          BlockStatement(node) {
            checkStatements(context, node.body);
          },
          SwitchCase(node) {
            checkStatements(context, node.consequent);
          },
        };
      },
    },

    'destructuring-props-order': {
      meta: {
        type: 'suggestion',
        fixable: 'code',
        docs: {
          description:
            'Enforce that destructured parameters without default values are declared before parameters with default values.',
        },
        messages: {},
      },
      create(context) {
        return {
          FunctionDeclaration(node) {
            checkParams(context, node.params);
          },
          FunctionExpression(node) {
            checkParams(context, node.params);
          },
          ArrowFunctionExpression(node) {
            checkParams(context, node.params);
          },
        };
      },
    },

    'eol-last': {
      meta: {
        type: 'layout',
        fixable: 'whitespace',
        docs: {
          description: 'Require newline at the end of files (EOF/EOL).',
        },
        messages: {},
      },
      create(context) {
        return {
          Program(node) {
            const sourceCode = context.sourceCode || context.getSourceCode();
            const text = sourceCode.text || (sourceCode.getText ? sourceCode.getText() : '');

            if (text.length > 0 && !text.endsWith('\n')) {
              context.report({
                node,
                message: 'Newline required at end of file (eol-last).',
                fix(fixer) {
                  return fixer.insertTextAfter(node, '\n');
                },
              });
            }
          },
        };
      },
    },

    'max-len': {
      meta: {
        type: 'layout',
        schema: [
          {
            type: 'object',
            properties: {
              code: { type: 'integer' },
            },
            additionalProperties: false,
          },
        ],
        docs: {
          description: 'Enforce a maximum line length.',
        },
        messages: {},
      },
      create(context) {
        const config = (context.options && context.options[0]) || {};
        const maxLen = config.code || 120;

        return {
          Program(node) {
            const sourceCode = context.sourceCode || context.getSourceCode();
            const lines =
              sourceCode.lines ||
              (sourceCode.text
                ? sourceCode.text.split(/\r?\n/)
                : sourceCode.getText().split(/\r?\n/));

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];

              if (line.length > maxLen) {
                // Ignore lines containing URLs
                if (/https?:\/\//.test(line)) continue;

                // Ignore pure import statements
                if (/^\s*import\s+.+from\s+['"].+['"];?$/.test(line)) continue;

                // Ignore comment lines
                if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;

                // Ignore lines where the excess is inside a string/template literal
                if (/['"`]/.test(line) && line.replace(/['"`].*?['"`]/g, '').length <= maxLen) {
                  continue;
                }

                context.report({
                  node,
                  loc: {
                    start: { line: i + 1, column: maxLen },
                    end: { line: i + 1, column: line.length },
                  },
                  message: `Line ${i + 1} exceeds the maximum line length of ${maxLen} (current: ${line.length}).`,
                });
              }
            }
          },
        };
      },
    },

    // ─── HYDRATION / RENDERING ────────────────────────────────────────

    'no-suppress-hydration-without-comment': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Require an explanatory comment when using suppressHydrationWarning to prevent silencing real bugs.',
        },
        messages: {},
      },
      create(context) {
        return {
          JSXAttribute(node) {
            if (!node.name || node.name.name !== 'suppressHydrationWarning') return;

            const sourceCode = context.sourceCode || context.getSourceCode();
            const attrLine = node.loc && node.loc.start.line;

            if (!attrLine) return;

            // Scan the raw source for the 'intentional' keyword within 5 lines above the attribute.
            // This reliably catches both // JS comments outside JSX and {/* JSX comments */} inside.
            const KEYWORD = 'intentional';
            const rawLines =
              sourceCode.lines ||
              (sourceCode.text
                ? sourceCode.text.split(/\r?\n/)
                : (sourceCode.getText ? sourceCode.getText() : '').split(/\r?\n/));

            const lookback = 5;
            const startLine = Math.max(0, attrLine - 1 - lookback); // 0-indexed

            // oxlint-disable-next-line universe/vertical-spacing -- blank line present; CRLF edge-case in self-check
            for (let i = startLine; i < attrLine - 1; i++) {
              if (rawLines[i] && rawLines[i].toLowerCase().includes(KEYWORD)) {
                return; // Found — compliant
              }
            }

            // Also check the attribute line itself (inline comment)
            const attrLineText = rawLines[attrLine - 1];

            if (attrLineText && attrLineText.toLowerCase().includes(KEYWORD)) return;

            context.report({
              node,
              message:
                'suppressHydrationWarning requires an explanatory comment within 5 lines above: ' +
                '// intentional: suppressHydrationWarning – <reason>',
            });
          },
        };
      },
    },

    // ─── NESTJS / BACKEND ────────────────────────────────────────────

    'nestjs-require-api-response-type': {
      meta: {
        type: 'problem',
        docs: { description: 'Require @ApiResponse to include "type" for Orval codegen.' },
      },
      create(context) {
        const filename = (context.filename || '').replace(/\\/g, '/');

        if (!filename.includes('/backend/') || !filename.endsWith('.controller.ts')) return {};

        return {
          MethodDefinition(node) {
            node.decorators?.forEach((d) => {
              const callee = d.expression?.callee;

              if (callee?.name !== 'ApiResponse') return;

              const arg = d.expression?.arguments?.[0];

              if (arg?.type !== 'ObjectExpression') return;

              const statusProp = arg.properties.find(
                (p) => p.key?.name === 'status' && [200, 201].includes(p.value?.value),
              );

              if (!statusProp) return;

              const hasType = arg.properties.some((p) => p.key?.name === 'type');

              if (!hasType) {
                context.report({
                  node: d,
                  message:
                    '@ApiResponse missing "type" property. Required for Orval type generation.',
                });
              }
            });
          },
        };
      },
    },

    'nestjs-require-bearer-auth-decorator': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Endpoints using @GetUser() must have @ApiBearerAuth() or @ApiCookieAuth().',
        },
      },
      create(context) {
        const filename = (context.filename || '').replace(/\\/g, '/');

        if (!filename.includes('/backend/') || !filename.endsWith('.controller.ts')) return {};

        const HTTP_DECORATORS = ['Get', 'Post', 'Put', 'Delete', 'Patch'];

        return {
          MethodDefinition(node) {
            const isEndpoint = node.decorators?.some((d) =>
              HTTP_DECORATORS.includes(d.expression?.callee?.name || d.expression?.name || ''),
            );

            if (!isEndpoint) return;

            const hasGetUser = node.value.params?.some((p) =>
              p.decorators?.some((d) => d.expression?.callee?.name === 'GetUser'),
            );

            if (!hasGetUser) return;

            const methodHasAuth = node.decorators?.some((d) => {
              const name = d.expression?.callee?.name || d.expression?.name;

              return name === 'ApiBearerAuth' || name === 'ApiCookieAuth';
            });

            if (methodHasAuth) return;

            const classNode = node.parent?.parent;
            const classHasAuth = classNode?.decorators?.some((d) => {
              const name = d.expression?.callee?.name || d.expression?.name;

              return name === 'ApiBearerAuth' || name === 'ApiCookieAuth';
            });

            if (!classHasAuth) {
              context.report({
                node,
                message:
                  'Endpoint uses @GetUser() but missing @ApiBearerAuth()/@ApiCookieAuth().',
              });
            }
          },
        };
      },
    },

    'nestjs-controller-return-type': {
      meta: {
        type: 'problem',
        docs: { description: 'Require explicit return types on controller endpoints.' },
      },
      create(context) {
        const filename = (context.filename || '').replace(/\\/g, '/');

        if (!filename.includes('/backend/') || !filename.endsWith('.controller.ts')) return {};

        const HTTP_DECORATORS = ['Get', 'Post', 'Put', 'Delete', 'Patch'];

        return {
          MethodDefinition(node) {
            const isEndpoint = node.decorators?.some((d) =>
              HTTP_DECORATORS.includes(d.expression?.callee?.name || d.expression?.name || ''),
            );

            if (!isEndpoint) return;

            if (!node.value?.returnType) {
              context.report({
                node,
                message: `Controller method '${node.key?.name}' must have an explicit return type.`,
              });
            }
          },
        };
      },
    },

    'una-primitive-purity': {
      meta: {
        type: 'problem',
        docs: { description: 'Prevent business imports in una/ design system.' },
      },
      create(context) {
        const filename = (context.filename || '').replace(/\\/g, '/');

        if (!filename.includes('/ui/') || !filename.includes('/una/')) return {};

        const FORBIDDEN_SOURCES = [
          '@uni-hub/services',
          '@uni-hub/store',
          '@uni-hub/views',
          'zustand',
          'next/navigation',
          'next/router',
          '@universe/backend',
          '@universe/database',
        ];

        return {
          ImportDeclaration(node) {
            const src = node.source?.value || '';
            const match = FORBIDDEN_SOURCES.find((f) => src.includes(f));

            if (match) {
              context.report({
                node,
                message: `Design System Purity: 'una/' must not import '${src}'.`,
              });
            }
          },
        };
      },
    },

    'nestjs-controller-no-prisma': {
      meta: {
        type: 'problem',
        docs: { description: 'Controllers must not import PrismaService.' },
      },
      create(context) {
        const filename = (context.filename || '').replace(/\\/g, '/');

        if (!filename.includes('/backend/') || !filename.endsWith('.controller.ts')) return {};

        return {
          ImportDeclaration(node) {
            const src = node.source?.value || '';

            if (src.includes('prisma.service') || src.includes('prisma.module')) {
              context.report({
                node,
                message: 'Controllers must not import PrismaService directly.',
              });
            }
          },
        };
      },
    },

    'no-empty-catch-in-services': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow catch blocks returning empty data without logging.',
        },
      },
      create(context) {
        const filename = (context.filename || '').replace(/\\/g, '/');

        if (!filename.endsWith('.service.ts')) return {};

        function isEmptyFallback(arg) {
          if (!arg) return false;

          if (arg.type === 'ArrayExpression' && arg.elements.length === 0) return true;

          return !!(
            arg.type === 'ObjectExpression' &&
            arg.properties.length > 0 &&
            arg.properties.every(
              (p) =>
                (p.value?.type === 'ArrayExpression' && p.value.elements.length === 0) ||
                (p.value?.type === 'Literal' && (p.value.value === 0 || p.value.value === '')),
            )
          );
        }

        return {
          CatchClause(node) {
            const body = node.body?.body;

            if (!body || body.length !== 1) return;

            const stmt = body[0];

            if (stmt.type !== 'ReturnStatement') return;

            if (isEmptyFallback(stmt.argument)) {
              context.report({
                node,
                message: 'Silent error: catch returns empty data. Add Logger.error() or rethrow.',
              });
            }
          },

          CallExpression(node) {
            if (
              node.callee?.type !== 'MemberExpression' ||
              node.callee.property?.name !== 'catch'
            ) {
              return;
            }

            const handler = node.arguments?.[0];

            if (
              !handler ||
              (handler.type !== 'ArrowFunctionExpression' &&
                handler.type !== 'FunctionExpression')
            ) {
              return;
            }

            if (handler.body?.type !== 'BlockStatement' && isEmptyFallback(handler.body)) {
              context.report({
                node,
                message: 'Silent error: .catch() returns empty fallback.',
              });

              return;
            }

            const body = handler.body?.body;

            if (
              body?.length === 1 &&
              body[0].type === 'ReturnStatement' &&
              isEmptyFallback(body[0].argument)
            ) {
              context.report({
                node,
                message: 'Silent error: .catch() returns empty fallback.',
              });
            }
          },
        };
      },
    },

    'core-package-isolation': {
      meta: {
        type: 'problem',
        docs: { description: 'Prevent @universe/core from importing app-layer packages.' },
      },
      create(context) {
        const filename = (context.filename || '').replace(/\\/g, '/');

        if (!filename.includes('/packages/core/')) return {};

        const FORBIDDEN = [
          '@nestjs/',
          'prisma',
          '@prisma/',
          'react',
          'react-dom',
          'next',
          'zustand',
          '@universe/database',
          'express',
        ];

        return {
          ImportDeclaration(node) {
            const src = node.source?.value || '';
            const match = FORBIDDEN.find((f) => src.startsWith(f) || src.includes(f));

            if (match) {
              context.report({
                node,
                message: `@universe/core must not import '${src}'.`,
              });
            }
          },
        };
      },
    },
  },
};
