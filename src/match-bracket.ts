// code in this file based on match-brackets, (c) Sung Won Cho, MIT Licence
// https://github.com/sungwoncho/match-bracket
//
// modified by Ben Swift Dec 2017 (based on match-brackets v1.0.0)

import { Position } from 'vscode';

// from tracker.js

var Tracker = function (position) {
  this.line = position.line;
  this.cursor = position.cursor;
};

// Keep track of the current position
Tracker.prototype.advancePosition = function (char) {
  if (char === '\n') {
    this.line++;
    this.cursor = 1;
  } else {
    this.cursor++;
  }
};

Tracker.prototype.moveCursor = function (unit) {
  this.cursor += unit;
};

// comment_patterns.js

var commentPatterns = {
  js: [
    {
      start: '//',
      end: '\n',
      multiLine: false
    },
    {
      start: '/*',
      end: '*/',
      multiLine: true
    }
  ],
  xtm: [
    {
      start: ';',
      end: '\n',
      multiLine: false
    }
  ]
};

function getCommentPatterns(extension) {
  var patterns = commentPatterns[extension];

  if (patterns) {
    return patterns;
  } else {
    return [];
  }
}

// match_bracket.js

/**
 * Calculates the position of the matching bracket in the given code.
 * @param {String} code
 * @param {Object} bracketPos - position of the bracket
 *        e.g. {line: 2, cursor: 3}
 */
export let matchBracket = (code: string, bracketPosition: Position, extension: string, backward: boolean = false) => {
  // workaround for the fact that match-brackets lib uses 1-based indexing
  // this is also handled when returning from this funciton (TODO fix properly)
  let bracketPos = {
    line: bracketPosition.line + 1,
    cursor: bracketPosition.character + 1
  };
  const QUOTATION_PAIRS = {
    '\"': '\"',
  };
  const BRACKET_PAIRS = {
    '(': ')'
  };
  const COMMENT_PATTERNS = getCommentPatterns(extension);

  // Trims the portion of the code before the bracket appears
  // Returns a string against which we can scan for the matching bracket
  function trim(code, bracketPos) {
    var lines = code.split('\n').slice(bracketPos.line - 1);
    lines[0] = lines[0].substring(bracketPos.cursor - 1);

    return lines.join('\n');
  }

  var tracker = new Tracker(bracketPos);
  var trimmed = trim(code, bracketPos);
  var bracket = trimmed[0];
  var bracketStack = [];
  var activeComment = '';
  var activeQuotations = [];
  var commentPattern, candidate;

  //console.log(`TRIMMED:\n'${trimmed}'\n`);

  for (var i = 0; i < trimmed.length; i++) {
    var char = trimmed[i];
    //console.log(`char: ${char} at ${i} quotes: ${activeQuotations.length} comment: ${activeComment} brackstack: ${bracketStack.length} `);

    // Check for comments
    if (activeQuotations.length <= 0) { // don't look for comments inside strings!
      for (var j = 0; j < COMMENT_PATTERNS.length; j++) {
        if (activeComment.length === 0) {
          commentPattern = COMMENT_PATTERNS[j].start;
          candidate = trimmed.substring(i, i + commentPattern.length);

          if (candidate === commentPattern) {
            activeComment = COMMENT_PATTERNS[j];
          }
        } else {
          commentPattern = COMMENT_PATTERNS[j].end;
          candidate = trimmed.substring(i, i + commentPattern.length);

          if (candidate === commentPattern) {
            activeComment = '';
          }
        }
      }
    }

    tracker.advancePosition(char);

    if (activeComment) {
      continue;
    }

    // Check for quotations
    if (QUOTATION_PAIRS[char]) {
      var latestQuotation = activeQuotations[activeQuotations.length - 1];

      if (latestQuotation === char) {
        activeQuotations.pop();
      } else {
        activeQuotations.push(char);
      }
    }

    if (activeQuotations.length > 0) {
      continue;
    }

    // If no comments or quotations are active, match brackets.
    if (char === BRACKET_PAIRS[bracket]) {
      bracketStack.pop();
    } else if (char === bracket) {
      bracketStack.push(char);
    }

    if (bracketStack.length === 0) {
      let res = new Position(tracker.line - 1, tracker.cursor - 1);
      console.log(`returning: ${JSON.stringify(res)}`);
      return new Position(tracker.line - 1, tracker.cursor - 1);
    }
  }

  // If for loop terminates without returning, the bracket is unmatched.
  return null;
};
