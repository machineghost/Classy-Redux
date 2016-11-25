import {expect} from 'chai';
import sinon from 'sinon';
import {ReducerBuilder, StoreBuilder} from '../src/index.js';

// DON'T FORGET: These tests run against the *BUILT* version of the library

describe(`ClassyRedux`, () => {
    let sandbox;
    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
        sandbox.restore();
    });
    describe(`ReducerBuilder`, () => {
        let builder;
        beforeEach(() => {
            class TestReducerBuilder extends ReducerBuilder {
                noopAction() {

                }
            }
            builder = new TestReducerBuilder();
            ReducerBuilder.prototype.someAction = sandbox.stub();
        });
        describe(`#constructor`, () => {
            it(`can be instantiated`, () => {
                expect(builder).to.be.ok;
            });
        });
        describe(`#build`, () => {
            it(`binds the reducer to the reducer builder`, () => {
                const bind = sandbox.stub().returns(`bound`);
                builder.reducer = {bind};
                builder.build();
                expect(bind.calledWith(builder)).to.be.true;
                expect(builder.reducer).to.equal(`bound`);
            });
        });
        describe(`#clone`, () => {
            it(`produces a clone which does not mutate the original`, () => {
                const original = {a: 1, b: {c: 2}};
                const clone = builder.clone(original);
                delete clone.a;
                clone.b.c = 3;
                clone.d = 'foo';
                expect(original).to.eql({a: 1, b: {c: 2}});
            });
        });
        describe(`#reducer`, () => {
            describe(`when passed a Redux-generated ("@@redux") action`, () => {
                it(`returns a clone of the previous state`, () => {
                    builder.clone = () => `foo`;
                    expect(builder.reducer({}, {type: "@@redux/INIT"})).to.equal(`foo`);
                });
            });
            describe(`when passed a non-Redux-generated (not "@@redux") action`, () => {
                describe(`#when there is no matching action handler`, () => {
                    it(`throws an error`, () => {
                        const invalidReduce = () => builder.reducer({}, {type: `foo`});
                        expect(invalidReduce).to.throw(`Invalid action type`);
                    });
                });
                describe(`#when there is a matching action handler`, () => {
                    beforeEach(() => {
                        builder.beforeAction = sandbox.stub();
                        builder.someAction = sandbox.stub();
                        builder.afterAction = sandbox.stub();
                    });
                    it(`clears the "reduction" state`, () => {
                        builder.reduction = `something`;
                        builder.reducer({}, {type: `SOME_ACTION`});
                        expect(builder.reduction).to.eql({});
                    });
                    it(`calls the beforeAction and sets/returns the new state from it`, () => {
                        builder.beforeAction.returns(`new state`);
                        expect(builder.reducer({}, {type: `SOME_ACTION`})).to.equal(`new state`);
                        expect(builder.state).to.equal(`new state`);
                    });
                    it(`calls the action handler and sets/returns the new state from it`, () => {
                        builder.someAction.returns(`new state`);
                        expect(builder.reducer({}, {type: `SOME_ACTION`})).to.equal(`new state`);
                        expect(builder.state).to.equal(`new state`);
                    });
                    it(`calls the afterAction and sets/returns the new state from it`, () => {
                        builder.afterAction.returns(`new state`);
                        expect(builder.reducer({}, {type: `SOME_ACTION`})).to.equal(`new state`);
                        expect(builder.state).to.equal(`new state`);
                    });
                    it(`calls the beforeAction/handler/afterAction in the correct order`, () => {
                        builder.clone = () => ({a: 0});
                        builder.beforeAction.returns({a: 1});
                        builder.someAction.returns({a: 2});
                        builder.reducer({}, {type: `SOME_ACTION`});

                        expect(builder.beforeAction.calledWith({a: 0}));
                        expect(builder.someAction.calledWith({a: 1}));
                        expect(builder.afterAction.calledWith({a: 2}));
                    });
                });
            });
        });
        describe(`#state`, () => {
            it(`returns the last previous state`, () => {
                builder._state = `foo`;
                expect(builder.state).to.equal(`foo`);
            });
        });
    });
    describe(`StoreBuilder`, () => {
        let builder;
        let fakeCreateStore;
        let fakeComposedMiddleware;
        let fakeMiddleware1;
        let fakeMiddleware2;
        // Define a couple of fake ReducerBuilder classes to use in our tests
        class BarBuilder extends ReducerBuilder {
            stateName = `foo`;

            reducer() {
                return `foo reducer result`
            }
        }
        class FooBuilder extends ReducerBuilder {
            stateName = `bar`;

            reducer() {
                return `bar reducer result`
            }
        }
        beforeEach(() => {
            fakeCreateStore = sandbox.stub().returns(`fake store`);
            fakeComposedMiddleware = sandbox.stub().returns(fakeCreateStore);
            fakeMiddleware1 = sandbox.spy((createStore) => createStore);
            fakeMiddleware2 = sandbox.spy((createStore) => createStore);

            sandbox.stub(StoreBuilder.prototype, `combineReducers`).returns(`combined reducers`);
            sandbox.stub(StoreBuilder.prototype, `compose`).returns(fakeComposedMiddleware);
            builder = new StoreBuilder(fakeMiddleware1, FooBuilder, fakeMiddleware2, BarBuilder);
        });
        describe(`#constructor`, () => {
            it(`can be instantiated`, () => {
                new StoreBuilder();
            });
            it(`stores all provided middleware`, () => {
                expect(builder._middleware).to.eql([fakeMiddleware1, fakeMiddleware2]);
            });
            it(`composes all stored middleware in to a single function`, () => {
                expect(builder._composedMiddleware).to.eql(fakeComposedMiddleware);
            });
            it(`stores all reducer builders (ie. all non-middleware arguments)`, () => {
                expect(builder._reducerBuilderClasses).to.eql([FooBuilder, BarBuilder]);
            });
            it(`stores instances of all of its reducer builders`, () => {
                expect(builder._reducerBuilders[0]).to.be.an.instanceof(FooBuilder);
                expect(builder._reducerBuilders[1]).to.be.an.instanceof(BarBuilder);
            });
            it(`stores all of its reducer builders' reducers by their state name`, () => {
                expect(builder._reducers.foo()).to.equal(`foo reducer result`);
                expect(builder._reducers.bar()).to.equal(`bar reducer result`);
            });
            it(`stores the combination of all of its reducer builders' reducers`, () => {
                expect(builder.combineReducers.args[0][0]).to.equal(builder._reducers);
                expect(builder._combinedReducers).to.equal(`combined reducers`)
            });
        });
        describe(`#combineReducers`, () => {
            // NOTE: combineReducers is just a Redux alias, so all we need is a basic smoke test
            it(`can be called without throwing an exception`, () => {
                builder.combineReducers();
            });
        });
        describe(`#compose`, () => {
            // NOTE: compose is just a Redux alias, so all we need for it is a basic smoke test
            it(`can be called without throwing an exception`, () => {
                builder.compose();
            });
        });
        describe(`get createStore`, () => {
            describe(`when a createStore function has already been created`, () => {
                it(`returns the previously created createStore`, () => {
                    builder._createStore = `create store`;
                    expect(builder.createStore).to.equal(`create store`);
                });
            });
            describe(`when a createStore function has not yet been composed`, () => {
                it(`composes a new createStore using the provided middleware`, () => {
                    delete builder._createStore;
                    expect(builder.store).to.equal(`fake store`);
                    expect(builder.compose.args[0]).to.eql([fakeMiddleware1, fakeMiddleware2]);
                });
            });
        });
        describe(`get store`, () => {
            describe(`when a store has already been built`, () => {
                it(`returns the previously built store`, () => {
                    builder._store = `fake store`;
                    expect(builder.store).to.equal(`fake store`);
                });
            });
            describe(`when a store hasn't already been built`, () => {
                it(`builds a new store from its reducers and returns it`, () => {
                    delete builder._store;
                    builder._createStore = sandbox.stub().returns(`fake store`);

                    builder.store;
                    expect(builder._createStore.args[0][0]).to.equal(builder._combinedReducers);
                    expect(builder.store).to.equal(`fake store`);
                });
            });
        });
    });
});
