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

        var rem = Object.prototype.toString.call(this.rule.symbols[this.expect]) === '[object RegExp]' && this.rule.symbols[this.expect].test(inp);
        if (rem || this.rule.symbols[this.expect] === inp) {
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
            var w = 0;
            while (w < table[this.reference].length) {
                var s = table[this.reference][w];
                var x = s.consume(me.rule.name);
                if (x) {
                    x.data[x.data.length-1] = me.data;
                    table[location].push(x);
                    x.complete(table, location);
                }
                w++;
            }
            /*table[this.reference].forEach(function(s) {
                var x = s.consume(me.rule.name);
                if (x) {
                    x.data[x.data.length-1] = me.data;
                    table[location].push(x);
                    x.complete(table, location);
                }
            });*/
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
        table[0].forEach(function(s) {
            s.complete(table, 0);
        });
        for (var current = 0; current < tokens.length; current++) {
            table.push([]);
            table[current].forEach(function(s) {
                var x = s.consume(tokens[current]);
                if (x) {
                    table[current+1].push(x);
                }
            });
            // TODO: This isn't the right thing
            // you want to only push in what you want
            rules.forEach(function (r) {
                table[current+1].push(r.getStartState(current+1));
            });
            table[current+1].forEach(function(s) {
                s.complete(table, current+1);
            });
        }
        console.log(require('util').inspect(table, null, {depth:-1}));

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


    //var E = {"rule":"E"};
    //var T = {"rule":"T"};

    //var a = new Rule(E, [new RegExp("[0-9]+")], function(d) {return parseFloat(d);});
    //var b = new Rule(E, [E, "*", E], function(d) {return d[0] * d[2]; });
    //var c = new Rule(E, [E, "+", E], function(d) {return d[0] + d[2]; });
    // TODO OOOps
    //console.log(Parse("1 + 2 * 3 + 4".split(/\s+/), [a,b, c], E));

    //var S = {rule:'S'}
    //var a = new Rule(S, [S, 'b'])
    //var b = new Rule(S, [])
    //console.log(Parse(["b", "b", "b"], [a, b], S));

    var S = {rule:'S'}
    var a = new Rule(S, [S, S, 'b'])
    var b = new Rule(S, [])
    console.log(Parse(["b", "b", "b"], [a, b], S));
}();