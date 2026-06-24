/**
 * LaTeX Renderer Utility
 * 统一的 LaTeX 渲染模块，支持：
 * 1. 数学公式渲染（通过 KaTeX）— 所有 KaTeX 支持的数学命令
 * 2. 完整 LaTeX 文档渲染（自定义转换器）— 常用文本模式命令
 * 3. 自动检测 + 显式标记 (\begin{latex}...\end{latex})
 *
 * KaTeX 数学模式通过占位符机制处理：
 *   extractLatex → (body converter) → renderLatexPlaceholders
 * 因此 LaTeX 正文中的 $...$ / $$...$$ / \(...\) / \[...\] 都由 KaTeX 渲染
 */
import katex from 'katex';

// ========== 数学公式提取/渲染 ==========

var LATEX_PLACEHOLDER_PREFIX = '%%LATEXPLACEHOLDER';
var latexCounter = 0;

function extractLatex(content) {
  latexCounter = 0;
  var placeholders = {};
  var result = content;

  // 优先级：先匹配块级（避免被行内误匹配）
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, function(match, formula) {
    var key = LATEX_PLACEHOLDER_PREFIX + latexCounter + '%%';
    latexCounter++;
    placeholders[key] = { formula: formula.trim(), displayMode: true };
    return key;
  });
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, function(match, formula) {
    var key = LATEX_PLACEHOLDER_PREFIX + latexCounter + '%%';
    latexCounter++;
    placeholders[key] = { formula: formula.trim(), displayMode: false };
    return key;
  });
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, function(match, formula) {
    var key = LATEX_PLACEHOLDER_PREFIX + latexCounter + '%%';
    latexCounter++;
    placeholders[key] = { formula: formula.trim(), displayMode: true };
    return key;
  });
  result = result.replace(/\$([^\$\n]+?)\$/g, function(match, formula) {
    var key = LATEX_PLACEHOLDER_PREFIX + latexCounter + '%%';
    latexCounter++;
    placeholders[key] = { formula: formula.trim(), displayMode: false };
    return key;
  });

  return { text: result, placeholders: placeholders };
}

function renderLatexPlaceholders(html, placeholders) {
  var keys = Object.keys(placeholders);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var info = placeholders[key];
    try {
      var rendered = katex.renderToString(info.formula, {
        displayMode: info.displayMode,
        throwOnError: false,
        strict: false,
        trust: true
      });
      var wrapper = info.displayMode
        ? '<div class="katex-display-wrapper">' + rendered + '</div>'
        : rendered;
      html = html.replace(key, wrapper);
    } catch (e) {
      html = html.replace(key, '<code class="latex-error">' + escapeHtml(info.formula) + '</code>');
    }
  }
  return html;
}

// ========== 工具函数 ==========

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function findMatchingBrace(text, startIndex) {
  if (text[startIndex] !== '{') return -1;
  var depth = 1;
  var i = startIndex + 1;
  var limit = Math.min(text.length, startIndex + 10000);
  while (i < limit && depth > 0) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}

function readCommandName(text, startIndex) {
  var i = startIndex + 1;
  var name = '';
  while (i < text.length && /[a-zA-Z@]/.test(text[i])) {
    name += text[i];
    i++;
  }
  return { name: name, nextIndex: i };
}

// ========== 检测 ==========

var LATEX_BODY_COMMANDS = [
  'colorbox', 'fcolorbox', 'textcolor', 'color', 'pagecolor',
  'framebox', 'parbox',
  'textbf', 'textit', 'emph', 'underline', 'textsl',
  'texttt', 'textsf', 'textsc', 'textrm', 'textnormal', 'textup', 'textmd',
  'textsuperscript', 'textsubscript',
  'sffamily', 'rmfamily', 'ttfamily', 'bfseries', 'itshape', 'slshape', 'scshape',
  'Huge', 'huge', 'LARGE', 'Large', 'large',
  'small', 'footnotesize', 'tiny', 'normalsize',
  'centering', 'raggedright', 'raggedleft',
  'hspace', 'vspace', 'hfill', 'vfill',
  'item', 'noindent', 'indent', 'par', 'linebreak', 'pagebreak',
  'today', 'LaTeX', 'TeX', 'ldots', 'dots', 'quad', 'qquad'
];

function isLatexBodyFragment(content) {
  if (/^#{1,6}\s/m.test(content)) return false;
  if (/```[\s\S]*?```/.test(content)) return false;
  if (/^\s*[-*+]\s/m.test(content)) return false;
  if (/^\s*\d+\.\s/m.test(content)) return false;
  if (/\[.*\]\(.*\)/.test(content)) return false;

  var cmdCount = 0;
  for (var j = 0; j < LATEX_BODY_COMMANDS.length; j++) {
    var pattern = new RegExp('\\\\' + LATEX_BODY_COMMANDS[j] + '[\\s{\\[\\)\\\\]', 'g');
    var matches = content.match(pattern);
    if (matches) cmdCount += matches.length;
  }
  return cmdCount >= 2;
}

function detectLatexDocument(content) {
  if (!content) return { detected: false, innerContent: null };

  var explicitMatch = content.match(/\\begin\{latex\}([\s\S]*?)\\end\{latex\}/);
  if (explicitMatch) {
    return { detected: true, innerContent: explicitMatch[1].trim() };
  }
  if (/^\s*\\documentclass/.test(content)) {
    return { detected: true, innerContent: content.trim() };
  }
  if (/\\begin\{document\}/.test(content) && /\\end\{document\}/.test(content)) {
    return { detected: true, innerContent: content.trim() };
  }
  if (isLatexBodyFragment(content)) {
    return { detected: true, innerContent: content.trim() };
  }
  return { detected: false, innerContent: null };
}

// ========== 前言解析 ==========

function parsePreamble(preamble) {
  var styles = {};
  var fontSize = null;
  var sizeMatch = preamble.match(/\\documentclass\s*\[(\d+pt)\s*\]/);
  if (sizeMatch) fontSize = sizeMatch[1];

  var pageColorMatch = preamble.match(/\\pagecolor\{([^}]+)\}/);
  if (pageColorMatch) styles.backgroundColor = pageColorMatch[1];
  var colorMatch = preamble.match(/\\color\{([^}]+)\}/);
  if (colorMatch) styles.color = colorMatch[1];
  var geomMatch = preamble.match(/\\geometry\{([^}]+)\}/);
  if (geomMatch) {
    var marginMatch = geomMatch[1].match(/margin\s*=\s*([^,}]+)/);
    if (marginMatch) styles.padding = marginMatch[1];
  }
  var sizeDeclMatch = preamble.match(/\\(Huge|huge|LARGE|Large|large|small|footnotesize|tiny|normalsize)(?:\s|$|\\|%|\{)/);
  if (sizeDeclMatch && !fontSize) fontSize = sizeDeclMatch[1];

  return { styles: styles, fontSize: fontSize };
}

// ========== 映射表 ==========

var SIZE_CLASS_MAP = {
  'tiny': 'latex-tiny', 'footnotesize': 'latex-footnotesize',
  'small': 'latex-small', 'normalsize': 'latex-normalsize',
  'large': 'latex-large', 'Large': 'latex-Large',
  'LARGE': 'latex-LARGE', 'huge': 'latex-huge', 'Huge': 'latex-Huge'
};

var SIZE_EM_MAP = {
  'tiny': '0.5em', 'footnotesize': '0.7em', 'small': '0.85em',
  'normalsize': '1em', 'large': '1.2em', 'Large': '1.44em',
  'LARGE': '1.73em', 'huge': '2.07em', 'Huge': '2.5em'
};

// 单参数文本命令 → HTML 元素映射
var ARG_COMMANDS = {
  'textbf':      { tag: 'strong', style: '' },
  'textit':      { tag: 'em', style: '' },
  'emph':        { tag: 'em', style: '' },
  'underline':   { tag: 'u', style: '' },
  'textsl':      { tag: 'span', style: 'font-style:oblique' },
  'texttt':      { tag: 'code', style: '' },
  'textsf':      { tag: 'span', style: 'font-family:sans-serif' },
  'textsc':      { tag: 'span', style: 'font-variant:small-caps' },
  'textrm':      { tag: 'span', style: 'font-family:serif' },
  'textnormal':  { tag: 'span', style: 'font-style:normal;font-weight:normal' },
  'textup':      { tag: 'span', style: 'font-style:normal' },
  'textmd':      { tag: 'span', style: 'font-weight:normal' },
  'textsuperscript': { tag: 'sup', style: '' },
  'textsubscript':   { tag: 'sub', style: '' }
};

// 特殊字符映射（反斜杠 + 单个字符）
var SPECIAL_CHARS = {
  '&': '&amp;', '%': '%', '$': '$', '{': '{', '}': '}',
  '_': '_', '#': '#',
  'P': '&para;', 'S': '&sect;',
  'i': 'i', 'j': 'j'  // 无点 i/j（简化处理）
};

// 特殊符号映射（反斜杠 + 名称 → HTML 实体或字符串）
var SYMBOL_MAP = {
  'textbackslash': '\\',
  'textasciitilde': '~',
  'textasciicircum': '^',
  'textless': '&lt;',
  'textgreater': '&gt;',
  'textbar': '|',
  'textbraceleft': '{',
  'textbraceright': '}',
  'textdollar': '$',
  'textunderscore': '_',
  'textpercent': '%',
  'textampersand': '&amp;',
  'textquotedblleft': '&ldquo;',
  'textquotedblright': '&rdquo;',
  'textquoteleft': '&lsquo;',
  'textquoteright': '&rsquo;',
  'textemdash': '&mdash;',
  'textendash': '&ndash;',
  'textexclamdown': '&iexcl;',
  'textquestiondown': '&iquest;',
  'textregistered': '&reg;',
  'texttrademark': '&trade;',
  'textcopyright': '&copy;',
  'textsterling': '&pound;',
  'textbullet': '&bull;',
  'textperiodcentered': '&middot;',
  'textordfeminine': '&ordf;',
  'textordmasculine': '&ordm;',
  'textdagger': '&dagger;',
  'textdaggerdbl': '&Dagger;',
  'textparagraph': '&para;',
  'textsection': '&sect;',
  'textvisiblespace': '&#9251;',
  'textcompwordmark': '&#8204;',
  'textellipsis': '&hellip;',
  'ldots': '&hellip;',
  'dots': '&hellip;',
  'LaTeX': 'L<sup>A</sup>T<sub>E</sub>X',
  'TeX': 'T<sub>E</sub>X',
  'today': new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
};

// ========== 正文转换器 ==========

function convertLatexBodyToHtml(text, preambleStyles, preambleFontSize) {
  var html = '';
  var i = 0;
  var openSizeSpans = [];
  var alignment = '';
  var hadLineBreak = false;
  // 列表状态栈：每进入一层列表 push { type: 'ul'|'ol' }，退出时 pop
  var listStack = [];
  // 声明式命令 span 栈（\color, \sffamily, \bfseries 等），分组结束时回滚
  var openDeclSpans = [];
  // 分组边界：每个 { 分组记录进入时的 openDeclSpans.length，} 时回滚
  var groupBoundaries = [];

  while (i < text.length) {
    // 跳过注释
    if (text[i] === '%') {
      var commentEnd = text.indexOf('\n', i);
      if (commentEnd === -1) break;
      i = commentEnd + 1;
      continue;
    }

    // 非反斜杠 → 直接处理字符
    if (text[i] !== '\\') {
      if (text[i] === '{') {
        // LaTeX 分组开始 — 记录当前声明深度，退出分组时回滚
        groupBoundaries.push(openDeclSpans.length);
      } else if (text[i] === '}') {
        // LaTeX 分组结束 — 回滚到分组前的声明状态
        if (groupBoundaries.length > 0) {
          var boundary = groupBoundaries.pop();
          while (openDeclSpans.length > boundary) {
            var decl = openDeclSpans.pop();
            html += (decl.closeTag || '</span>');
          }
        } else {
          html += '}';
        }
      } else if (text[i] === '\n') {
        html += hadLineBreak ? '<br>' : '\n';
        hadLineBreak = false;
      } else if (text[i] === '~') {
        html += '&nbsp;';
        hadLineBreak = false;
      } else if (text[i] === ' ') {
        html += ' ';
      } else {
        html += escapeHtml(text[i]);
        hadLineBreak = false;
      }
      i++;
      continue;
    }

    // === 处理反斜杠命令 ===
    var cmdInfo = readCommandName(text, i);
    var cmdName = cmdInfo.name;
    var afterCmdIndex = cmdInfo.nextIndex;

    // -- 空命令名：可能是 \\ 或特殊字符 \& \% \$ \{ \} \_ \# --
    if (cmdName === '') {
      // 双反斜杠换行
      if (afterCmdIndex < text.length && text[afterCmdIndex] === '\\') {
        i = afterCmdIndex + 1;
        var lbDim = '';
        if (i < text.length && text[i] === '[') {
          var dimEnd = text.indexOf(']', i);
          if (dimEnd !== -1) { lbDim = text.substring(i + 1, dimEnd); i = dimEnd + 1; }
        }
        if (i < text.length && text[i] === '*') i++;
        html += lbDim ? '<br style="margin-bottom:' + lbDim + '">' : '<br>';
        hadLineBreak = true;
        continue;
      }
      // 特殊字符 \& \% \$ \{ \} \_ \#
      if (afterCmdIndex < text.length && SPECIAL_CHARS.hasOwnProperty(text[afterCmdIndex])) {
        html += SPECIAL_CHARS[text[afterCmdIndex]];
        i = afterCmdIndex + 1;
        hadLineBreak = false;
        continue;
      }
      // 未知，原样输出
      html += '\\';
      i = afterCmdIndex;
      hadLineBreak = false;
      continue;
    }

    // -- 符号命令（\ldots, \today, \LaTeX, \TeX 等）--
    if (SYMBOL_MAP.hasOwnProperty(cmdName)) {
      html += SYMBOL_MAP[cmdName];
      i = afterCmdIndex;
      hadLineBreak = false;
      continue;
    }

    // -- 带一个花括号参数的命令（\textbf{...} 等）--
    if (ARG_COMMANDS.hasOwnProperty(cmdName) && afterCmdIndex < text.length && text[afterCmdIndex] === '{') {
      var braceEnd = findMatchingBrace(text, afterCmdIndex);
      if (braceEnd !== -1) {
        var innerHtml = convertLatexBodyToHtml(text.substring(afterCmdIndex + 1, braceEnd), {}, null);
        var cmd = ARG_COMMANDS[cmdName];
        if (cmd.tag === 'span' && cmd.style) {
          html += '<span style="' + cmd.style + '">' + innerHtml + '</span>';
        } else if (cmd.tag === 'code') {
          html += '<code class="latex-tt">' + innerHtml + '</code>';
        } else {
          html += '<' + cmd.tag + '>' + innerHtml + '</' + cmd.tag + '>';
        }
        i = braceEnd + 1;
        continue;
      }
    }

    // -- 字体大小声明 --
    if (SIZE_CLASS_MAP.hasOwnProperty(cmdName)) {
      while (openSizeSpans.length > 0) { html += '</span>'; openSizeSpans.pop(); }
      if (cmdName !== 'normalsize') {
        html += '<span class="' + SIZE_CLASS_MAP[cmdName] + '">';
        openSizeSpans.push(cmdName);
      }
      i = afterCmdIndex;
      hadLineBreak = false;
      continue;
    }

    // -- 字体族声明（\sffamily, \rmfamily, \ttfamily）--
    var FONT_FAMILY_DECL = { sffamily: 'sans-serif', rmfamily: 'serif', ttfamily: 'monospace' };
    if (FONT_FAMILY_DECL.hasOwnProperty(cmdName)) {
      html += '<span style="font-family:' + FONT_FAMILY_DECL[cmdName] + '">';
      openDeclSpans.push({ closeTag: '</span>' });
      i = afterCmdIndex;
      continue;
    }

    // -- 字体样式声明（\bfseries, \itshape, \slshape, \scshape）--
    var FONT_STYLE_DECL = {
      bfseries: 'font-weight:bold',
      itshape: 'font-style:italic',
      slshape: 'font-style:oblique',
      scshape: 'font-variant:small-caps'
    };
    if (FONT_STYLE_DECL.hasOwnProperty(cmdName)) {
      html += '<span style="' + FONT_STYLE_DECL[cmdName] + '">';
      openDeclSpans.push({ closeTag: '</span>' });
      i = afterCmdIndex;
      continue;
    }

    // -- 换行命令 --
    if (cmdName === 'newline' || cmdName === 'linebreak') {
      html += '<br>';
      i = afterCmdIndex;
      hadLineBreak = true;
      continue;
    }

    // -- 段落 --
    if (cmdName === 'par') {
      html += '<p></p>';
      i = afterCmdIndex;
      hadLineBreak = true;
      continue;
    }

    // -- 分页 --
    if (cmdName === 'pagebreak' || cmdName === 'newpage') {
      html += '<hr class="latex-pagebreak">';
      i = afterCmdIndex;
      hadLineBreak = true;
      continue;
    }

    // -- 缩进 --
    if (cmdName === 'noindent') { i = afterCmdIndex; continue; }
    if (cmdName === 'indent') {
      html += '<span style="margin-left:2em"></span>';
      i = afterCmdIndex;
      continue;
    }

    // -- 对齐 --
    if (cmdName === 'centering') { alignment = 'center'; i = afterCmdIndex; continue; }
    if (cmdName === 'raggedright' || cmdName === 'flushleft') { alignment = 'left'; i = afterCmdIndex; continue; }
    if (cmdName === 'raggedleft' || cmdName === 'flushright') { alignment = 'right'; i = afterCmdIndex; continue; }

    // -- 水平/垂直间距 --
    if (cmdName === 'hfill') { html += '<span style="flex:1"></span>'; i = afterCmdIndex; continue; }
    if (cmdName === 'vfill') { html += '<div style="flex:1"></div>'; i = afterCmdIndex; continue; }
    if (cmdName === 'quad') { html += '&emsp;'; i = afterCmdIndex; continue; }
    if (cmdName === 'qquad') { html += '&emsp;&emsp;'; i = afterCmdIndex; continue; }
    if ((cmdName === 'hspace' || cmdName === 'vspace') && afterCmdIndex < text.length && text[afterCmdIndex] === '{') {
      var spEnd = findMatchingBrace(text, afterCmdIndex);
      if (spEnd !== -1) {
        var spVal = text.substring(afterCmdIndex + 1, spEnd);
        if (cmdName === 'hspace') {
          html += '<span style="display:inline-block;width:' + spVal + '"></span>';
        } else {
          html += '<div style="height:' + spVal + '"></div>';
        }
        i = spEnd + 1;
        continue;
      }
    }

    // -- \rule[lift]{width}{height}（实心矩形）--
    if (cmdName === 'rule') {
      var ruleLift = '0px', ruleWidth = '', ruleHeight = '';
      var ruleIdx = afterCmdIndex;
      if (ruleIdx < text.length && text[ruleIdx] === '[') {
        var rbEnd = text.indexOf(']', ruleIdx);
        if (rbEnd !== -1) { ruleLift = text.substring(ruleIdx + 1, rbEnd); ruleIdx = rbEnd + 1; }
      }
      if (ruleIdx < text.length && text[ruleIdx] === '{') {
        var rwEnd = findMatchingBrace(text, ruleIdx);
        if (rwEnd !== -1) { ruleWidth = text.substring(ruleIdx + 1, rwEnd); ruleIdx = rwEnd + 1; }
      }
      if (ruleIdx < text.length && text[ruleIdx] === '{') {
        var rhEnd = findMatchingBrace(text, ruleIdx);
        if (rhEnd !== -1) { ruleHeight = text.substring(ruleIdx + 1, rhEnd); ruleIdx = rhEnd + 1; }
      }
      if (ruleWidth && ruleHeight) {
        html += '<span style="display:inline-block;position:relative;top:' + ruleLift +
          ';width:' + ruleWidth + ';height:' + ruleHeight +
          ';background-color:currentColor"></span>';
        i = ruleIdx;
        continue;
      }
    }

    // -- 环境 begin/end --
    if (cmdName === 'begin') {
      var envName = readEnvName(text, afterCmdIndex);
      if (envName) {
        var envResult = beginEnvironment(envName, afterCmdIndex);
        if (envResult) {
          html += envResult.html;
          listStack = envResult.listStack || listStack;
          i = afterCmdIndex + envResult.consumed;
          continue;
        }
      }
      i = afterCmdIndex;
      continue;
    }
    if (cmdName === 'end') {
      var endEnvName = readEnvName(text, afterCmdIndex);
      if (endEnvName) {
        var endResult = endEnvironment(endEnvName, listStack);
        html += endResult.html;
        listStack = endResult.listStack;
        i = afterCmdIndex + endEnvName.length + 2;
        continue;
      }
      i = afterCmdIndex;
      continue;
    }

    // -- \item（列表项）--
    if (cmdName === 'item') {
      html += '<li>';
      // 可选参数 \item[label]
      if (afterCmdIndex < text.length && text[afterCmdIndex] === '[') {
        var optEnd = text.indexOf(']', afterCmdIndex);
        if (optEnd !== -1) {
          html += '<span class="latex-item-label">' + escapeHtml(text.substring(afterCmdIndex + 1, optEnd)) + '</span> ';
          i = optEnd + 1;
          continue;
        }
      }
      i = afterCmdIndex;
      continue;
    }

    // -- \color{name}（声明式，作用域到分组结束）--
    if (cmdName === 'color' && afterCmdIndex < text.length && text[afterCmdIndex] === '{') {
      var clrEnd = findMatchingBrace(text, afterCmdIndex);
      if (clrEnd !== -1) {
        var clrName = text.substring(afterCmdIndex + 1, clrEnd);
        html += '<span style="color:' + clrName + '">';
        openDeclSpans.push({ closeTag: '</span>' });
        i = clrEnd + 1;
        continue;
      }
    }

    // -- \pagecolor{name}（设置背景色）--
    if (cmdName === 'pagecolor' && afterCmdIndex < text.length && text[afterCmdIndex] === '{') {
      var pcEnd = findMatchingBrace(text, afterCmdIndex);
      if (pcEnd !== -1) {
        preambleStyles.backgroundColor = text.substring(afterCmdIndex + 1, pcEnd);
        i = pcEnd + 1;
        continue;
      }
    }

    // -- \textcolor{color}{text} --
    if (cmdName === 'textcolor' && afterCmdIndex < text.length && text[afterCmdIndex] === '{') {
      var tcColorEnd = findMatchingBrace(text, afterCmdIndex);
      if (tcColorEnd !== -1 && tcColorEnd + 1 < text.length && text[tcColorEnd + 1] === '{') {
        var tcColor = text.substring(afterCmdIndex + 1, tcColorEnd);
        var tcContentEnd = findMatchingBrace(text, tcColorEnd + 1);
        if (tcContentEnd !== -1) {
          var tcInnerHtml = convertLatexBodyToHtml(text.substring(tcColorEnd + 2, tcContentEnd), {}, null);
          html += '<span style="color:' + tcColor + '">' + tcInnerHtml + '</span>';
          i = tcContentEnd + 1;
          continue;
        }
      }
    }

    // -- \colorbox{color}{text} --
    if (cmdName === 'colorbox' && afterCmdIndex < text.length && text[afterCmdIndex] === '{') {
      var cbColorEnd = findMatchingBrace(text, afterCmdIndex);
      if (cbColorEnd !== -1 && cbColorEnd + 1 < text.length && text[cbColorEnd + 1] === '{') {
        var cbColor = text.substring(afterCmdIndex + 1, cbColorEnd);
        var cbContentEnd = findMatchingBrace(text, cbColorEnd + 1);
        if (cbContentEnd !== -1) {
          var cbInnerHtml = convertLatexBodyToHtml(text.substring(cbColorEnd + 2, cbContentEnd), {}, null);
          html += '<span class="latex-colorbox" style="background-color:' + cbColor + '">' + cbInnerHtml + '</span>';
          i = cbContentEnd + 1;
          continue;
        }
      }
    }

    // -- \fcolorbox{frame}{bg}{text} --
    if (cmdName === 'fcolorbox' && afterCmdIndex < text.length && text[afterCmdIndex] === '{') {
      var fFrameEnd = findMatchingBrace(text, afterCmdIndex);
      if (fFrameEnd !== -1 && fFrameEnd + 1 < text.length && text[fFrameEnd + 1] === '{') {
        var fFrameColor = text.substring(afterCmdIndex + 1, fFrameEnd);
        var fBgEnd = findMatchingBrace(text, fFrameEnd + 1);
        if (fBgEnd !== -1 && fBgEnd + 1 < text.length && text[fBgEnd + 1] === '{') {
          var fBgColor = text.substring(fFrameEnd + 2, fBgEnd);
          var fContentEnd = findMatchingBrace(text, fBgEnd + 1);
          if (fContentEnd !== -1) {
            var fInnerHtml = convertLatexBodyToHtml(text.substring(fBgEnd + 2, fContentEnd), {}, null);
            html += '<span class="latex-colorbox" style="background-color:' + fBgColor + ';border:2px solid ' + fFrameColor + '">' + fInnerHtml + '</span>';
            i = fContentEnd + 1;
            continue;
          }
        }
      }
    }

    // -- \framebox{content}（带边框盒子）--
    if (cmdName === 'framebox' && afterCmdIndex < text.length && text[afterCmdIndex] === '{') {
      var fbEnd = findMatchingBrace(text, afterCmdIndex);
      if (fbEnd !== -1) {
        var fbInner = convertLatexBodyToHtml(text.substring(afterCmdIndex + 1, fbEnd), {}, null);
        html += '<span class="latex-fbox">' + fbInner + '</span>';
        i = fbEnd + 1;
        continue;
      }
    }

    // -- \parbox{width}{content}（固定宽度段落盒）--
    if (cmdName === 'parbox' && afterCmdIndex < text.length && text[afterCmdIndex] === '{') {
      var pwEnd = findMatchingBrace(text, afterCmdIndex);
      if (pwEnd !== -1 && pwEnd + 1 < text.length && text[pwEnd + 1] === '{') {
        var parWidth = text.substring(afterCmdIndex + 1, pwEnd);
        var pcEnd = findMatchingBrace(text, pwEnd + 1);
        if (pcEnd !== -1) {
          var parInner = convertLatexBodyToHtml(text.substring(pwEnd + 2, pcEnd), {}, null);
          html += '<div class="latex-parbox" style="width:' + parWidth + '">' + parInner + '</div>';
          i = pcEnd + 1;
          continue;
        }
      }
    }

    // -- 未知命令 → 字面输出 --
    html += escapeHtml('\\' + cmdName);
    i = afterCmdIndex;
    hadLineBreak = false;
  }

  // 关闭未闭合的结构
  while (openDeclSpans.length > 0) {
    var declSpan = openDeclSpans.pop();
    html += (declSpan.closeTag || '</span>');
  }
  while (openSizeSpans.length > 0) { html += '</span>'; openSizeSpans.pop(); }
  while (listStack.length > 0) {
    var lst = listStack.pop();
    html += '</li></' + lst.type + '>';
  }

  // 容器包装
  var containerStyle = '';
  var bf = preambleFontSize;
  if (bf && SIZE_EM_MAP.hasOwnProperty(bf)) containerStyle += 'font-size:' + SIZE_EM_MAP[bf] + ';';
  else if (bf) containerStyle += 'font-size:' + bf + ';';
  if (preambleStyles.color) containerStyle += 'color:' + preambleStyles.color + ';';
  if (preambleStyles.backgroundColor) containerStyle += 'background-color:' + preambleStyles.backgroundColor + ';';
  if (preambleStyles.padding) containerStyle += 'padding:' + preambleStyles.padding + ';';
  if (alignment) containerStyle += 'text-align:' + alignment + ';';

  var styleAttr = containerStyle ? ' style="' + containerStyle + '"' : '';
  return '<div class="latex-document"' + styleAttr + '>' + html + '</div>';
}

// ========== 环境处理 ==========

/**
 * 读取环境名称（{name}）
 */
function readEnvName(text, startIdx) {
  if (startIdx >= text.length || text[startIdx] !== '{') return null;
  var end = text.indexOf('}', startIdx);
  if (end === -1) return null;
  return text.substring(startIdx + 1, end);
}

/**
 * 处理 \begin{环境名}
 * 返回 { html: string, consumed: number, listStack: array }
 */
function beginEnvironment(envName, startIdx) {
  var consumed = envName.length + 2; // {name}
  var html = '';
  var listStack = null;

  switch (envName) {
    case 'center':
      html = '<div style="text-align:center">';
      break;
    case 'flushleft':
      html = '<div style="text-align:left">';
      break;
    case 'flushright':
      html = '<div style="text-align:right">';
      break;
    case 'quote':
    case 'quotation':
      html = '<blockquote class="latex-quote">';
      break;
    case 'verbatim':
      html = '<pre class="latex-verbatim"><code>';
      break;
    case 'itemize':
      html = '<ul class="latex-list">';
      listStack = [{ type: 'ul' }];
      break;
    case 'enumerate':
      html = '<ol class="latex-list">';
      listStack = [{ type: 'ol' }];
      break;
    case 'description':
      html = '<dl class="latex-desc">';
      listStack = [{ type: 'dl' }];
      break;
    case 'minipage':
      html = '<div class="latex-minipage">';
      break;
    case 'abstract':
      html = '<div class="latex-abstract">';
      break;
    case 'verse':
      html = '<div class="latex-verse">';
      break;
    default:
      // 不认识的 div 环境
      html = '<div class="latex-env-' + envName + '">';
  }
  return { html: html, consumed: consumed, listStack: listStack };
}

/**
 * 处理 \end{环境名}
 */
function endEnvironment(envName, listStack) {
  var html = '';
  var newStack = listStack.slice();
  switch (envName) {
    case 'center':
    case 'flushleft':
    case 'flushright':
    case 'minipage':
    case 'abstract':
    case 'verse':
      html = '</div>';
      break;
    case 'quote':
    case 'quotation':
      html = '</blockquote>';
      break;
    case 'verbatim':
      html = '</code></pre>';
      break;
    case 'itemize':
    case 'enumerate':
      if (newStack.length > 0 && (newStack[newStack.length - 1].type === 'ul' || newStack[newStack.length - 1].type === 'ol')) {
        var lst = newStack.pop();
        html = '</li></' + lst.type + '>';
      }
      break;
    case 'description':
      if (newStack.length > 0 && newStack[newStack.length - 1].type === 'dl') {
        newStack.pop();
        html = '</dl>';
      }
      break;
    default:
      html = '</div>';
  }
  return { html: html, listStack: newStack };
}

// ========== 文档渲染入口 ==========

function renderLatexDocument(content) {
  var extracted = extractLatex(content);
  var text = extracted.text;

  var bodyStartMatch = text.match(/\\begin\{document\}/);
  var bodyEndMatch = text.match(/\\end\{document\}/);
  var preambleText = '';
  var bodyText = text;

  if (bodyStartMatch) {
    preambleText = text.substring(0, bodyStartMatch.index);
    var bodyStart = bodyStartMatch.index + bodyStartMatch[0].length;
    bodyText = bodyEndMatch
      ? text.substring(bodyStart, bodyEndMatch.index)
      : text.substring(bodyStart);
  }

  var preamble = parsePreamble(preambleText);
  var html = convertLatexBodyToHtml(bodyText, preamble.styles, preamble.fontSize);
  return { html: html, placeholders: extracted.placeholders };
}

/**
 * LaTeX 代码块占位符前缀
 */
var LATEX_BLOCK_PREFIX = '%%LATEXBLOCKPLACEHOLDER';

/**
 * 提取 ```latex ... ``` 代码块并替换为占位符
 * @returns {{ text: string, blocks: object }}
 */
function extractLatexBlocks(content) {
  var blocks = {};
  var counter = 0;
  // 匹配 ```latex\n...\n``` 或 ```latex ... ```
  var result = content.replace(/```latex\s*\n?([\s\S]*?)```/g, function(match, latexCode) {
    var key = LATEX_BLOCK_PREFIX + counter + '%%';
    counter++;
    blocks[key] = latexCode.trim();
    return key;
  });
  return { text: result, blocks: blocks };
}

/**
 * 渲染 LaTeX 代码块占位符
 */
function renderLatexBlocks(html, blocks) {
  var keys = Object.keys(blocks);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var latexCode = blocks[key];
    try {
      var rendered = renderLatexDocument(latexCode);
      // 合并 placeholders（LaTeX 代码块内可能还有数学公式）
      var finalHtml = rendered.html;
      if (rendered.placeholders && Object.keys(rendered.placeholders).length > 0) {
        finalHtml = renderLatexPlaceholders(finalHtml, rendered.placeholders);
      }
      html = html.replace(key, '<div class="latex-block-wrapper">' + finalHtml + '</div>');
    } catch (e) {
      html = html.replace(key, '<code class="latex-error">[LaTeX Error] ' + escapeHtml(latexCode.substring(0, 100)) + '</code>');
    }
  }
  return html;
}

function processContent(content, markedInstance) {
  if (!content) return { html: '', placeholders: {} };

  // Step 0: 提取 ```latex ... ``` 代码块
  var blockResult = extractLatexBlocks(content);
  var textWithoutBlocks = blockResult.text;

  // 检测剩余内容（去掉代码块后）是否为 LaTeX 文档
  var detection = detectLatexDocument(textWithoutBlocks);
  if (detection.detected) {
    // 路径 B: LaTeX 文档
    var docResult = renderLatexDocument(detection.innerContent);
    // 如果有被提取的 LaTeX 代码块，嵌入回去
    if (Object.keys(blockResult.blocks).length > 0) {
      docResult.html = renderLatexBlocks(docResult.html, blockResult.blocks);
    }
    return docResult;
  }

  // 路径 A: Markdown + 数学公式
  var extracted = extractLatex(textWithoutBlocks);
  var html = markedInstance(extracted.text);

  // 把提取的 LaTeX 代码块渲染后放回去
  if (Object.keys(blockResult.blocks).length > 0) {
    html = renderLatexBlocks(html, blockResult.blocks);
  }

  return { html: html, placeholders: extracted.placeholders };
}

/**
 * 渲染最终 HTML（DOMPurify 净化后调用）
 * 处理数学公式占位符 + LaTeX 代码块占位符
 */
function renderFinalHtml(html, placeholders) {
  html = renderLatexPlaceholders(html, placeholders);
  return html;
}

// ========== 导出 ==========

export default {
  processContent: processContent,
  renderFinalHtml: renderFinalHtml,
  extractLatex: extractLatex,
  renderLatexPlaceholders: renderLatexPlaceholders,
  detectLatexDocument: detectLatexDocument,
  renderLatexDocument: renderLatexDocument
};
