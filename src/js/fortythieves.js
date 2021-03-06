YUI.add(
    "forty-thieves",
    function(Y) {
        const Solitaire = Y.Solitaire,
            FortyThieves = (Y.Solitaire.FortyThieves = Solitaire.instance(
                Solitaire,
                {
                    fields: ["Foundation", "Deck", "Waste", "Tableau"],

                    deal: function() {
                        let card, stack, row;
                        const deck = this.deck,
                            stacks = this.tableau.stacks;

                        for (row = 0; row < 4; row++) {
                            for (stack = 0; stack < 10; stack++) {
                                card = deck.pop().faceUp();
                                stacks[stack].push(card);
                            }
                        }

                        deck.createStack();
                    },

                    redeal: function() {
                        // ggpo
                    },

                    turnOver: function() {
                        const deck = this.deck.stacks[0],
                            waste = this.waste.stacks[0];

                        for (
                            let i = deck.cards.length, stop = i - 1;
                            i > stop && i;
                            i--
                        ) {
                            deck.my_Last()
                                .faceUp()
                                .moveTo(waste);
                        }
                    },

                    Stack: Solitaire.instance(Solitaire.Stack),

                    Foundation: {
                        stackConfig: {
                            total: 8,
                            layout: {
                                hspacing: 1.25,
                                top: 0,
                                left: function() {
                                    return Solitaire.Card.width * 3;
                                },
                            },
                        },
                        field: "foundation",
                        draggable: false,
                    },

                    Deck: Solitaire.instance(Solitaire.Deck, {
                        count: 2,

                        stackConfig: {
                            total: 1,
                            layout: {
                                hspacing: 0,
                                top: 0,
                                left: 0,
                            },
                        },
                        field: "deck",

                        init: function() {
                            Solitaire.Deck.init.call(this);
                            Y.Array.each(this.cards, function(c) {
                                c.faceDown();
                            });
                        },

                        createStack: function() {
                            for (let i = this.cards.length - 1; i >= 0; i--) {
                                this.stacks[0].push(this.cards[i]);
                            }
                        },
                    }),

                    Waste: {
                        stackConfig: {
                            total: 1,
                            layout: {
                                hspacing: 0,
                                top: 0,
                                left: function() {
                                    return Solitaire.Card.width * 1.25;
                                },
                            },
                        },
                        field: "waste",
                        draggable: true,
                    },

                    Tableau: {
                        stackConfig: {
                            total: 10,
                            layout: {
                                hspacing: 1.31,
                                top: function() {
                                    return Solitaire.Card.height * 1.5;
                                },
                                left: 0,
                            },
                        },
                        field: "tableau",
                        draggable: true,
                    },

                    Card: Solitaire.instance(Solitaire.Card, {
                        validTarget: function(stack) {
                            const target = stack.my_Last();

                            switch (stack.field) {
                                case "tableau":
                                    if (!target) {
                                        return this.rank === 13;
                                    } else {
                                        return (
                                            !target.isFaceDown &&
                                            target.suit === this.suit &&
                                            target.rank === this.rank + 1
                                        );
                                    }
                                    break;
                                case "foundation":
                                    if (!target) {
                                        return this.rank === 1;
                                    } else {
                                        return (
                                            target.suit === this.suit &&
                                            target.rank === this.rank - 1
                                        );
                                    }
                                    break;
                                default:
                                    return false;
                            }
                        },
                    }),
                },
            ));

        Y.Array.each(FortyThieves.fields, function(field) {
            FortyThieves[field].Stack = Solitaire.instance(FortyThieves.Stack);
        });

        Y.mix(
            FortyThieves.Stack,
            {
                cssClass: "freestack",

                validTarget: function(stack) {
                    return (
                        stack.field === "tableau" &&
                        this.first().validTarget(stack)
                    );
                },

                validCard: function() {
                    return false;
                },
            },
            true,
        );

        Y.mix(
            FortyThieves.Tableau.Stack,
            {
                setCardPosition: function(card) {
                    return this.lastCardSetCardPosition(card);
                },
            },
            true,
        );

        Y.mix(
            FortyThieves.Deck.Stack,
            {
                createDOMElement: function() {
                    Solitaire.Stack.createDOMElement.call(this);
                    this.node.on("click", Solitaire.Events.clickEmptyDeck);
                },
            },
            true,
        );

        FortyThieves.Foundation.Stack.cssClass = "freefoundation";
    },
    "0.0.1",
    { requires: ["solitaire"] },
);
