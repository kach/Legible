~function() {
    function ParseRegex(r) {
        var PATTERN = {};
        var PAREN = {};
        var KLEENE = {};
        var CONCATENATION = {};
        var ALTERNATION = {};
        var id = function(d) {return d[0]};
        var CHAR = {};
        var CHARSET = {};
        var CHARSETCHAR = {};
        var CHARSETCHARLIST = {};
        var INT = {};
        var yuck = /[^\\?*+)(|\[\]\{\}]/
        var rules = [
            new Earley.Rule(INT, [/\d/], function(d) {return d[0];}),
            new Earley.Rule(INT, [INT, /\d/], function(d) {return d[0]+d[1];}),

            new Earley.Rule(CHAR, [yuck], id),
            new Earley.Rule(CHAR, ["\\", /./], function (d) {return d[0]+d[1];}),

            new Earley.Rule(CHARSET, ["[", CHARSETCHARLIST,"]"], function(d) {return {"type":"charset", "data":d[1]}}),
            new Earley.Rule(CHARSET, ["[", "^", CHARSETCHARLIST,"]"], function(d) {return {"type":"charset", "data":d[2], "negated":true}}),
            new Earley.Rule(CHARSET, [CHAR], id),

            new Earley.Rule(CHARSETCHAR, [/[a-zA-Z0-9]/, "-", /[a-zA-Z0-9]/], function(d){return {"type":"charsetrange", "from":d[0], "to":d[2]}}),
            new Earley.Rule(CHARSETCHAR, [ /[^\\\]\^]/ ], id),
            new Earley.Rule(CHARSETCHAR, ["\\", /./], function (d) {return d[0]+d[1];}),

            new Earley.Rule(CHARSETCHARLIST, [CHARSETCHAR]),
            new Earley.Rule(CHARSETCHARLIST, [CHARSETCHARLIST,CHARSETCHAR], function(d){return d[0].concat(d[1])}),

            new Earley.Rule(PAREN, ["(", PATTERN, ")"], function(d){return {type:"paren", arg:d[1]};}),
            new Earley.Rule(PAREN, ["(", "?", ":", PATTERN, ")"], function(d){return {type:"paren", "noncapturing":true, arg:d[3]};}),
            new Earley.Rule(PAREN, [CHARSET], id),

            new Earley.Rule(KLEENE, [KLEENE, "*"], function(d) {return {type:"*", arg:d[0]}}),
            new Earley.Rule(KLEENE, [KLEENE, "?"], function(d) {return {type:"?", arg:d[0]}}),
            new Earley.Rule(KLEENE, [KLEENE, "+"], function(d) {return {type:"+", arg:d[0]}}),
            new Earley.Rule(KLEENE, [KLEENE, "{", INT, "}"], function(d) {return {type:"{1}", arg:d[0], n:d[2]}}),
            new Earley.Rule(KLEENE, [KLEENE, "{", INT, ",", INT, "}"], function(d) {return {type:"{2}", arg:d[0], ns:d[2]+d[4]}}),
            new Earley.Rule(KLEENE, [PAREN], id),

            new Earley.Rule(CONCATENATION, [KLEENE]),
            new Earley.Rule(CONCATENATION, [CONCATENATION, KLEENE], function(d) {return d[0].concat([d[1]])}),

            new Earley.Rule(ALTERNATION, [ALTERNATION, "|", CONCATENATION], function(d) {return {type:"|", arg:[d[0], d[2]]}}),
            new Earley.Rule(ALTERNATION, [CONCATENATION], id),
            new Earley.Rule(PATTERN, [ALTERNATION], id),
            new Earley.Rule(PATTERN, [], function() {return []}),
        ];
        return Earley.Parse(r.replace(/\s+/g, "").split(""), rules, PATTERN);
    }
    function Stringify(parsed) {
        if (typeof parsed === 'string') {
            return parsed;
        } else if (Array.isArray(parsed)) {
            var o = "";
            parsed.forEach(function(p) {
                o += Stringify(p);
            });
            return o;
        } else {
            if (parsed.type === "|") {
                return Stringify(parsed.arg[0]) + "|" + parsed.arg[1];
            } else if (parsed.type === "paren") {
                return "(" + (parsed.noncapturing ? "?:" : "") + Stringify(parsed.arg) + ")";
            } else if (parsed.type === "charset") {
                return "["+(parsed.negated ? "^" : "")+Stringify(parsed.data)+"]";
            } else if (parsed.type === "charsetrange") {
                return parsed.from+"-"+parsed.to;
            } else if (parsed.type === "{1}") {
                //return parsed.from+"-"+parsed.to;
                return parsed.arg + "{" + parsed.n + "}";
            } else if (parsed.type === "{2}") {
                //return parsed.from+"-"+parsed.to;
                return parsed.arg + "{" + parsed.ns[0] + "," + parsed.ns[1] + "}";
            } else {
                return Stringify(parsed.arg[0]) + parsed.type;
            }
        }
    }

    function Highlight(parsed) {
        if (typeof parsed === 'string') {
            var out = document.createElement("span");
            out.innerHTML = parsed;
            out.className = "char";
            if (parsed.length > 1 || [".", "^", "$"].indexOf(parsed) !== -1) {
                out.className += " special";
                out.addEventListener("mouseover", function(){
                    out.className += " highlit";
                    document.getElementById("output-explanation").appendChild(
                        document.createTextNode({
                            "\\w": "Word characters (letters of both cases, numbers, and the underscore).",
                            "\\W": "Anything that isn't a letter, number, or underscore.",
                            ".": "Any character",
                            "\\d": "A base-10 digit (0 to 9)",
                            "\\D": "Anything that isn't a base-10 digit (0-9)",
                            "\\s": "Whitespace (space, tab, or line break)",
                            "\\S": "A non-whitespace character",
                            "\\t": "Tab",
                            "\\r": "Carriage return",
                            "\\n": "A line break",
                            "\\v": "Vertical tab",
                            "\\f": "Form feed",
                            "\\b": "A boundary between words",
                            "\\B": "Something that isn't a boundary between words",
                            "$": "End of the input",
                            "^": "The beginning of the input",
                        }[parsed] ||  (/\d/.test(parsed) && "The result of the "+parsed.charAt(1)+"th capturing group.")  || "A '"+parsed.charAt(1)+"'")
                    );
                }, false);
                out.addEventListener("mouseout", function(){
                    out.className = out.className.replace("highlit", "");
                    document.getElementById("output-explanation").removeChild(
                        document.getElementById("output-explanation").firstChild
                    );
                }, false);
            }
            return out;
        } else if (Array.isArray(parsed)) {
            var out = document.createElement("span");
            parsed.forEach(function(p) {
                out.appendChild(Highlight(p));
            });
            return out;
        } else {
            if (parsed.type === "|") {
                var out = document.createElement("span");
                var left = Highlight(parsed.arg[0]);
                var right = Highlight(parsed.arg[1]);
                var text = document.createElement("span");
                text.innerHTML = "|";
                text.className = "symbol";
                out.appendChild(left);
                out.appendChild(text);
                out.appendChild(right);
                text.addEventListener("mouseover", function(){
                    left.className += " highlit";
                    right.className += " highlit";
                    text.className += " highlit";
                    document.getElementById("output-explanation").appendChild(
                        document.createTextNode("'"+Stringify(parsed.arg[0]) + "' or '" + Stringify(parsed.arg[1])+"'")
                    );
                }, false);
                text.addEventListener("mouseout", function(){
                    left.className = left.className.replace("highlit", "");
                    right.className = right.className.replace("highlit", "");
                    text.className = text.className.replace("highlit", "");
                    document.getElementById("output-explanation").removeChild(
                        document.getElementById("output-explanation").firstChild
                    );
                }, false);
                return out;
            } else if (parsed.type === "paren") {
                var out = document.createElement("span");
                var lp = document.createElement("span");
                lp.innerHTML = parsed.noncapturing ? "(?:" : "(";
                var rp = document.createElement("span");
                rp.innerHTML = ")";
                lp.className = "paren";
                rp.className = "paren";
                out.appendChild(lp);
                out.appendChild(Highlight(parsed.arg));
                out.appendChild(rp);
                lp.addEventListener("mouseover", function(){
                    lp.className += " highlit";
                    rp.className += " highlit";
                    if (parsed.noncapturing) {
                        document.getElementById("output-explanation").appendChild(document.createTextNode("Non-capturing group."));
                    }
                }, false);
                lp.addEventListener("mouseout", function(){
                    lp.className = lp.className.replace("highlit", "");
                    rp.className = lp.className.replace("highlit", "");
                    if (parsed.noncapturing) {
                        document.getElementById("output-explanation").removeChild(document.getElementById("output-explanation").firstChild);
                    }
                }, false);
                rp.addEventListener("mouseover", function(){
                    lp.className += " highlit";
                    rp.className += " highlit";
                }, false);
                rp.addEventListener("mouseout", function(){
                    lp.className = lp.className.replace("highlit", "");
                    rp.className = lp.className.replace("highlit", "");
                }, false);
                return out;
            } else if (parsed.type === "charset") {
                var out = document.createElement("span");


                var lp = document.createElement("span");
                lp.innerHTML = parsed.negated ? "[^" : "[";
                var rp = document.createElement("span");
                rp.innerHTML = "]";
                lp.className = "paren";
                rp.className = "paren";
                out.appendChild(lp);
                out.appendChild(Highlight(parsed.data));
                out.appendChild(rp);
                lp.addEventListener("mouseover", function(){
                    lp.className += " highlit";
                    rp.className += " highlit";
                    document.getElementById("output-explanation").appendChild(
                        document.createTextNode("Any character "+(parsed.negated ? "not " : "")+"in this group.")
                    );
                }, false);
                lp.addEventListener("mouseout", function(){
                    lp.className = lp.className.replace("highlit", "");
                    rp.className = lp.className.replace("highlit", "");
                    document.getElementById("output-explanation").removeChild(
                        document.getElementById("output-explanation").firstChild
                    );
                }, false);
                rp.addEventListener("mouseover", function(){
                    lp.className += " highlit";
                    rp.className += " highlit";
                    document.getElementById("output-explanation").appendChild(
                        document.createTextNode("Any character "+(parsed.negated ? "not " : "")+"in this group.")
                    );
                }, false);
                rp.addEventListener("mouseout", function(){
                    lp.className = lp.className.replace("highlit", "");
                    rp.className = lp.className.replace("highlit", "");
                    document.getElementById("output-explanation").removeChild(
                        document.getElementById("output-explanation").firstChild
                    );
                }, false);
                return out;
            } else if (parsed.type === "charsetrange") {
                var out = document.createElement("span");
                out.className = "char";
                out.innerHTML = parsed.from + "-" + parsed.to;
                out.addEventListener("mouseover", function(){
                    out.className += " highlit";
                    document.getElementById("output-explanation").appendChild(
                        document.createTextNode("Any character from "+parsed.from+" to "+parsed.to)
                    );
                }, false);
                out.addEventListener("mouseout", function(){
                    out.className = out.className.replace("highlit", "");
                    document.getElementById("output-explanation").removeChild(
                        document.getElementById("output-explanation").firstChild
                    );
                }, false);
                return out;
            } else {
                var out = document.createElement("span");
                var arg = Highlight(parsed.arg);
                var text = document.createElement("span");
                text.className = "symbol";
                text.innerHTML = parsed.type === "{1}" ? "{"+parsed.n+"}" :
                                parsed.type === "{2}" ? "{"+parsed.ns[0]+","+parsed.ns[1]+"}" : parsed.type;
                out.appendChild(arg);
                out.appendChild(text);
                text.addEventListener("mouseover", function(){
                    arg.className += " highlit";
                    text.className += " highlit";
                    document.getElementById("output-explanation").appendChild(
                        document.createTextNode({
                        "*": "Match an arbitrary number of '" + Stringify(parsed.arg) + "'s",
                        "+": "Match at least one '" + Stringify(parsed.arg)+"'",
                        "?": "A '" + Stringify(parsed.arg) + "' may or may not exist.",
                        "{1}": "Match " + parsed.n + " of " + Stringify(parsed.arg),
                        "{2}": "Match anywhere from " + (parsed.ns&&parsed.ns[0]) + " to " + (parsed.ns&&parsed.ns[1]) + " of " + Stringify(parsed.arg),
                    }[parsed.type]));
                }, false);
                text.addEventListener("mouseout", function(){
                    arg.className = arg.className.replace("highlit", "");
                    text.className = text.className.replace("highlit", "");
                    document.getElementById("output-explanation").removeChild(
                        document.getElementById("output-explanation").firstChild
                    );
                }, false);
                return out;
            }
        }
    }
    window.addEventListener("load", function(){
        var input = document.querySelector("#input-box");
        function react() {
            var container = document.querySelector("#output-container");
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            var parsed = ParseRegex(input.value);
            if (parsed) {
                container.appendChild(Highlight(parsed));
            } else {
                var errorm = document.createElement("span");
                errorm.innerHTML = "Invalid regex.";
                errorm.className = "error";
                container.appendChild(errorm);
            }
        }
        input.addEventListener("keyup", react, false);
        react();
        console.log(ParseRegex("[a-zw]"));
    }, false);
}()