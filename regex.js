~function() {
    function ParseRegex(r) {
        var PATTERN = {};
        var PAREN = {};
        var KLEENE = {};
        var CONCATENATION = {};
        var ALTERNATION = {};
        var id = function(d) {return d[0]};
        var CHAR = {};
        var rules = [
            new Earley.Rule(CHAR, [/[\w\.]/], id),
            new Earley.Rule(CHAR, ["\\", /\w/], id),

            new Earley.Rule(PAREN, ["(", PATTERN, ")"], function(d){return d[1];}),
            new Earley.Rule(PAREN, [CHAR], id),

            new Earley.Rule(KLEENE, [KLEENE, "*"], function(d) {return {type:"*", arg:d[0]}}),
            new Earley.Rule(KLEENE, [KLEENE, "?"], function(d) {return {type:"?", arg:d[0]}}),
            new Earley.Rule(KLEENE, [KLEENE, "+"], function(d) {return {type:"+", arg:d[0]}}),
            new Earley.Rule(KLEENE, [PAREN], id),

            new Earley.Rule(CONCATENATION, [KLEENE]),
            new Earley.Rule(CONCATENATION, [CONCATENATION, KLEENE], function(d) {return d[0].concat([d[1]])}),

            new Earley.Rule(ALTERNATION, [CONCATENATION, "|", CONCATENATION], function(d) {return {type:"|", arg:[d[0], d[2]]}}),
            new Earley.Rule(ALTERNATION, [CONCATENATION], id),
            new Earley.Rule(PATTERN, [ALTERNATION], id),
        ];
        return Earley.Parse(r.replace(/\s+/g, "").split(""), rules, PATTERN);
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
                out.appendChild(left);
                out.appendChild(text);
                out.appendChild(right);
                text.addEventListener("mouseover", function(){
                    left.style.backgroundColor = "red";
                    right.style.backgroundColor = "red";
                }, false);
                text.addEventListener("mouseout", function(){
                    left.style.backgroundColor = "";
                    right.style.backgroundColor = "";
                }, false);
                return out;
            } else {
                var out = document.createElement("span");
                var arg = Highlight(parsed.arg[0]);
                var text = document.createElement("span");
                text.innerHTML = parsed.type;
                out.appendChild(arg);
                out.appendChild(text);
                text.addEventListener("mouseover", function(){
                    arg.style.backgroundColor = "red";
                }, false);
                text.addEventListener("mouseout", function(){
                    arg.style.backgroundColor = "";
                }, false);
                return out;
            }
        }
    }
    window.addEventListener("load", function(){
        function react() {
            var container = document.querySelector("#output-container");
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            container.appendChild(Highlight(ParseRegex("colou?r")));
        }
        react();
    }, false);
}()