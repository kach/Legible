~function() {
    function ParseRegex(r) {
        var PATTERN = {};
        var PAREN = {};
        var KLEENE = {};
        var CONCATENATION = {};
        var ALTERNATION = {};
        var id = function(d) {return d[0]};
        var CHAR = {};
        var yuck = /[^\\\.\?\+\)\(\|]/
        var rules = [
            new Earley.Rule(CHAR, [yuck], id),
            new Earley.Rule(CHAR, ["\\", /./], function (d) {return d[0]+d[1];}),

            new Earley.Rule(PAREN, ["(", PATTERN, ")"], function(d){return {type:"paren", arg:d[1]};}),
            new Earley.Rule(PAREN, [CHAR], id),

            new Earley.Rule(KLEENE, [KLEENE, "*"], function(d) {return {type:"*", arg:d[0]}}),
            new Earley.Rule(KLEENE, [KLEENE, "?"], function(d) {return {type:"?", arg:d[0]}}),
            new Earley.Rule(KLEENE, [KLEENE, "+"], function(d) {return {type:"+", arg:d[0]}}),
            new Earley.Rule(KLEENE, [PAREN], id),

            new Earley.Rule(CONCATENATION, [KLEENE]),
            new Earley.Rule(CONCATENATION, [CONCATENATION, KLEENE], function(d) {return d[0].concat([d[1]])}),

            new Earley.Rule(ALTERNATION, [ALTERNATION, "|", CONCATENATION], function(d) {return {type:"|", arg:[d[0], d[2]]}}),
            new Earley.Rule(ALTERNATION, [CONCATENATION], id),
            new Earley.Rule(PATTERN, [ALTERNATION], id),
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
                return "(" + Stringify(parsed.arg) + ")";
            } else {
                return Stringify(parsed.arg[0]) + parsed.type;
            }
        }
    }

    function Highlight(parsed) {
        if (typeof parsed === 'string') {
            var out = document.createElement("span");
            out.innerHTML = parsed;
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
                    text.className += " highlit-symbol";
                    document.getElementById("output-explanation").appendChild(
                        document.createTextNode(Stringify("'"+parsed.arg[0] + "' or '" + Stringify(parsed.arg[1])+"'"))
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
                lp.innerHTML = "(";
                var rp = document.createElement("span");
                rp.innerHTML = ")";
                lp.className = "paren";
                rp.className = "paren";
                out.appendChild(lp);
                //parsed.arg.forEach(function(p) {
                //    out.appendChild(Highlight(p));
                //});
                out.appendChild(Highlight(parsed.arg));

                lp.addEventListener("mouseover", function(){
                    lp.className += " highlit";
                    rp.className += " highlit";
                }, false);
                lp.addEventListener("mouseout", function(){
                    lp.className = lp.className.replace("highlit", "");
                    rp.className = lp.className.replace("highlit", "");
                }, false);
                rp.addEventListener("mouseover", function(){
                    lp.className += " highlit";
                    rp.className += " highlit";
                }, false);
                rp.addEventListener("mouseout", function(){
                    lp.className = lp.className.replace("highlit", "");
                    rp.className = lp.className.replace("highlit", "");
                }, false);
                out.appendChild(rp);
                return out;
            } else {
                var out = document.createElement("span");
                var arg = Highlight(parsed.arg);
                var text = document.createElement("span");
                text.className = "symbol";
                text.innerHTML = parsed.type;
                out.appendChild(arg);
                out.appendChild(text);
                text.addEventListener("mouseover", function(){
                    arg.className += " highlit";
                    text.className += " highlit";
                    document.getElementById("output-explanation").appendChild(
                        document.createTextNode({
                        "*": "Match an arbitrary number of '" + Stringify(parsed.arg) + "'s",
                        "+": "Match at least one '" + Stringify(parsed.arg)+"'",
                        "?": "A '" + Stringify(parsed.arg) + "' may or may not exist."
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
    }, false);
}()