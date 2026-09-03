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
      const rests = [];

      for (const p of properties) {
        if (p.type === 'RestElement') {
          rests.push(sourceCode.getText(p));
        } else if (p.value && p.value.type === 'AssignmentPattern') {
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
        
reordered = [...nonDefaults, ...defaults, ...rests].join(`,\n${indent}`);
      } else {
        reordered = [...nonDefaults, ...defaults, ...rests].join(', ');
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
    version: '1.0.0',
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
    'enforce-package-utils-alias': {
      meta: {
        type: 'suggestion',
        fixable: 'code',
        docs: {
          description:
            'Enforce package alias (@uni-hub/utils/...) instead of relative parent path (../utils/...).',
        },
        messages: {},
      },
      create(context) {
        return {
          ImportDeclaration(node) {
            const filePath =
              context.filename || (context.getFilename && context.getFilename()) || '';
            
// Only enforce inside packages/uni-hub
            if (filePath && !filePath.replace(/\\/g, '/').includes('packages/uni-hub')) {
              return;
            }

            const importPath = node.source && node.source.value;
            
if (typeof importPath === 'string') {
              const utilsMatch = importPath.match(/^(\.\.\/)+utils\/(.*)$/);
              
if (utilsMatch) {
                const subPath = utilsMatch[2];
                const replacement = `@uni-hub/utils/${subPath}`;
                
context.report({
                  node: node.source,
                  message: `Use package alias '${replacement}' instead of relative path '${importPath}'.`,
                  fix(fixer) {
                    return fixer.replaceText(node.source, `'${replacement}'`);
                  },
                });
              }
            }
          },
        };
      },
    },
  },
};
