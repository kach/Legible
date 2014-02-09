function dump(o) {
    console.log(require('util').inspect(
        o,
        null,
        {depth:-1}
    ));
}
~ function(exp) {
    function Rule(name, symbols, postprocess) {
        this.name = name;
        this.symbols = symbols;
        this.postprocess = postprocess || function(a){return a};
    }
    Rule.prototype.getStartState = function(location) {
        return new State(this, 0, location);
    }
    function State(rule, expect, reference) {
        this.rule = rule;
        this.expect = expect;
        this.reference = reference;
        this.data = [];
    }
    State.prototype.consume = function(inp) {
        var rem = typeof inp === 'string' && this.rule.symbols[this.expect] && this.rule.symbols[this.expect].test && this.rule.symbols[this.expect].test(inp);
        if (rem || this.rule.symbols[this.expect] === inp) {
            var a = new State(this.rule, this.expect+1, this.reference);

            a.data = this.data.slice(0);
            a.data.push(inp);
            return a;
        } else {
            return false;
        }
    };
    State.prototype.process = function(table, location, rules, addedRules) {
        if (this.expect === this.rule.symbols.length) {
            // I'm done
            this.data = this.rule.postprocess(this.data);
            var me = this;
            var w = 0;
            // We need a while here because the empty rule will
            // modify table[reference].
            while (w < table[this.reference].length) {
                var s = table[this.reference][w];
                var x = s.consume(me.rule.name);
                if (x) {
                    x.data[x.data.length-1] = me.data;
                    table[location].push(x);
                    x.process(table, location, rules, addedRules);
                }
                w++;
            }
        } else {
            // I'm not done, but I can predict something
            var exp = this.rule.symbols[this.expect];
            rules.forEach(function(r) {
                if (r.name === exp && addedRules.indexOf(r) === -1) {
                    addedRules.push(r);
                    var n = r.getStartState(location);
                    table[location].push(n);
                    n.process(table, location, rules, addedRules);
                }
            });
        }
    }

    function Parse(tokens, rules, start) {
        if (!start) {
            start = rules[0];
        }
        var table = [];
        table.push([]);

        // I could be expecting anything!
        var addedRules = [];
        rules.forEach(function (r) {
            if (r.name === start) {
                addedRules.push(r);
                table[0].push(r.getStartState(0));
            }
        });

        table[0].forEach(function(s) {
            s.process(table, 0, rules, addedRules);
        });
        for (var current = 0; current < tokens.length; current++) {
            table.push([]);
            table[current].forEach(function(s) {
                var x = s.consume(tokens[current]);
                if (x) {
                    table[current+1].push(x);
                }
            });
            var addedRules = [];
            table[current+1].forEach(function(s) {
                s.process(table, current+1, rules, addedRules);
            });
        }
        var considerations = [];
        table[table.length-1].forEach(function (t) {
            if (t.rule.name === start && t.expect === t.rule.symbols.length && t.reference === 0) {
                considerations.push(t);
            }
        });
        if (considerations[0]) {
            return considerations[0].data;
        } else {
            return false;
        }
    }
    /*
    // Test epsilon
    var S = {rule:'S'}
    var a = new Rule(S, [S, S, 'b'])
    var b = new Rule(S, [])
    //console.log(Parse(["b", "b", "b"], [a, b], S));

    var N = {};
    var I = {};
    var P = {};
    var E = {};
    var M = {};
    var A = {};
    var id = function(d) {return d[0]};
    var rules = [
        new Rule(I, [/[0-9]/, I], function(d){return d[0]+d[1];}),
        new Rule(I, [/[0-9]/], function(d){return d[0];}),

        new Rule(N, [I], function(d) {return parseFloat(d[0]);}),
        new Rule(N, [I, ".", I], function(d) {return parseFloat(d[0]+"."+d[2]);}),

        new Rule(P, ["(", S, ")"], function(d){return d[1];}),
        new Rule(P, [N], id),


        new Rule(E, [P, "^", E], function(d){return Math.pow(d[0], d[2])}),
        new Rule(E, [P], id),

        new Rule(M, [M, "*", E], function(d) {return d[0]*d[2]}),
        new Rule(M, [M, "/", E], function(d) {return d[0]/d[2]}),
        new Rule(M, [E], id),

        new Rule(S, [S, "+", M], function(d) {return d[0]+d[2]}),
        new Rule(S, [S, "-", M], function(d) {return d[0]-d[2]}),
        new Rule(S, [M], id),
    ];
    console.log(Parse("3*2 + 5.2^4".replace(/\s+/g, "").split("") , rules, S));
    */
    function ParseRegex(r) {
        var PATTERN = {};
        var PAREN = {};
        var KLEENE = {};
        var CONCATENATION = {};
        var ALTERNATION = {};
        var id = function(d) {return d[0]};
        var CHAR = {};
        var rules = [
            new Rule(CHAR, [/[\w\.]/], id),
            new Rule(CHAR, ["\\", /\w/], id),

            new Rule(PAREN, ["(", PATTERN, ")"], function(d){return d[1];}),
            new Rule(PAREN, [CHAR], id),

            new Rule(KLEENE, [KLEENE, "*"], function(d) {return {type:"*", arg:d[0]}}),
            new Rule(KLEENE, [KLEENE, "?"], function(d) {return {type:"?", arg:d[0]}}),
            new Rule(KLEENE, [KLEENE, "+"], function(d) {return {type:"+", arg:d[0]}}),
            new Rule(KLEENE, [PAREN], id),

            new Rule(CONCATENATION, [KLEENE]),
            new Rule(CONCATENATION, [CONCATENATION, KLEENE], function(d) {return d[0].concat([d[1]])}),

            new Rule(ALTERNATION, [CONCATENATION, "|", CONCATENATION], function(d) {return {type:"|", arg:[d[0], d[2]]}}),
            new Rule(ALTERNATION, [CONCATENATION], id),
            new Rule(PATTERN, [ALTERNATION], id),
        ];
        return Parse(r.replace(/\s+/g, "").split(""), rules, PATTERN);
    }
    dump(ParseRegex("my??"));
}();