/*
 Earley parser
*/
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
        if (this.rule.symbols[this.expect] === inp) {
            var a = new State(this.rule, this.expect+1, this.reference);

            a.data = this.data.slice(0);
            a.data.push(inp);
            return a;
        } else {
            return false;
        }
    }
    State.prototype.complete = function(table, location) {
        if (this.expect === this.rule.symbols.length) {
            this.data = this.rule.postprocess(this.data);
            var me = this;
            table[this.reference].forEach(function(s) {
                var x = s.consume(me.rule.name);
                if (x) {
                    x.data[x.data.length-1] = me.data;
                    table[location].push(x);
                    x.complete(table, location);
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
        rules.forEach(function (r) {
            table[0].push(r.getStartState(0));
        });

        for (var current = 0; current < tokens.length; current++) {
            table.push([]);
            table[current].forEach(function(s) {
                var x = s.consume(tokens[current]);
                if (x) {
                    table[current+1].push(x);
                }
            });
            table[current+1].forEach(function(s) {
                s.complete(table, current+1);
            });
            rules.forEach(function (r) {
                table[current+1].push(r.getStartState(current+1));
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


    var E = {"rule":"E"};
    var T = {"rule":"T"};

    var a = new Rule(E, ["1"]);
    var b = new Rule(E, ["(", E, ")"]);
    var c = new Rule(T, [E]);

    console.log(Parse("( ( 1 ) )".split(/\s+/), [a,b,c], E));
}(
    !function() {
        try {
            return module.exports;
        } catch(e) {
            return window.Earley;
        }
    }()
);