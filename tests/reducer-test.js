var expect = require('chai').expect
var sinon = require('sinon')
var reducerExports = require('../lib/reducer')
var actions = require('../lib/actions')
var actionReducers = reducerExports.actionReducers
var reducer = reducerExports.reducer

var REDUX_INIT = '@@redux/INIT'

describe('reducer', function () {
  var sandbox

  beforeEach(function () {
    sandbox = sinon.sandbox.create()
    sandbox.stub(console, 'error')
  })

  afterEach(function () {
    sandbox.restore()
  })

  ;[
    REDUX_INIT,
    actions.CHANGE_MODEL,
    actions.CHANGE_VALUE,
    actions.VALIDATION_RESOLVED
  ]
    .forEach((actionType) => {
      describe(`when action type is ${actionType}`, function () {
        var action, reducedState, state

        beforeEach(function () {
          action = {
            type: actionType
          }

          state = {
            foo: 'bar'
          }

          function stub () {
            return 'out'
          }

          sandbox.stub(actionReducers, actionType, stub)

          reducedState = reducer(state, action)
        })

        it('calls correct action reducer', function () {
          expect(actionReducers[actionType].callCount).to.equal(1)
          expect(actionReducers[actionType].lastCall.args).to.eql([state, action])
        })

        it('returns reduced state from action reducer', function () {
          expect(reducedState).to.equal('out')
        })

        it('does not log error', function () {
          expect(console.error.callCount).to.equal(0)
        })
      })
    })

  describe('unknown state', function () {
    var reducedState, state

    beforeEach(function () {
      state = {
        foo: 'bar'
      }

      reducedState = reducer(state, {type: 'bolt'})
    })

    it('logs error', function () {
      expect(console.error.callCount).to.equal(1)
      expect(console.error.lastCall.args).to.eql(['Do not recognize action bolt'])
    })

    it('returns state that was passed in', function () {
      expect(reducedState).to.equal(state)
    })
  })

  describe('initial state', function () {
    it('should be what we want', function () {
      var initialState = reducer({}, {type: REDUX_INIT})

      expect(initialState.errors).to.eql({})
      expect(initialState.validationResult).to.eql({warnings: [], errors: []})
      expect(initialState.value).to.eql(null)
    })

    it('does not remove required arrays', function () {

    })
  })

  describe('value manipulation', function () {
    it('can change a value', function () {
      var initialState = {
        errors: {},
        validationResult: {warnings: [], errors: []},
        value: {
          foo: 12,
          bar: {
            qux: 'cheese'
          }
        },
        baseModel: {}
      }
      var changedState = reducer(initialState, {type: actions.CHANGE_VALUE, value: 'wine', bunsenId: 'bar.qux'})
      expect(changedState.value.bar.qux).to.eql('wine')
      expect(changedState.value.foo).to.eql(12)
    })

    it('can remove a value', function () {
      var initialState = {
        errors: {},
        validationResult: {warnings: [], errors: []},
        value: {
          foo: 12,
          bar: {
            qux: 'cheese'
          }
        },
        baseModel: {}
      }
      var changedState = reducer(initialState, {type: actions.CHANGE_VALUE, value: '', bunsenId: 'bar.qux'})
      expect(changedState.value).to.eql({foo: 12, bar: {}})
    })

    it('can set the entire value', function () {
      var initialState = {
        errors: {},
        validationResult: {warnings: [], errors: []},
        value: {
          foo: 12,
          bar: {
            qux: 'cheese'
          }
        },
        baseModel: {}
      }
      var changedState = reducer(initialState, {type: actions.CHANGE_VALUE, value: {baz: 22}, bunsenId: null})
      expect(changedState.value).to.eql({baz: 22})
    })

    it('will prune all the dead wood when setting root object', function () {
      var model = {
        type: 'object',
        properties: {
          foo: {
            type: 'object',
            properties: {
              bar: {
                type: 'object',
                properties: {
                  baz: {
                    type: 'null'
                  },
                  qux: {
                    type: 'number'
                  }
                }
              },
              waldo: {
                type: 'null'
              },
              buzz: {
                type: 'boolean'
              },
              fizz: {
                type: 'boolean'
              }
            }
          }
        }
      }
      var initialState = {
        errors: {},
        validationResult: {warnings: [], errors: []},
        value: null,
        baseModel: model,
        model
      }
      var newValue = {
        foo: {
          bar: {
            baz: null,
            qux: 12
          },
          waldo: null,
          buzz: true,
          fizz: false
        }
      }

      var changedState = reducer(initialState, {type: actions.CHANGE_VALUE, value: newValue, bunsenId: null})
      expect(changedState.value).to.eql({foo: {bar: {qux: 12}, buzz: true, fizz: false}})
    })

    it('will prune all the dead wood out of a complex array', function () {
      var model = {
        type: 'object',
        properties: {
          a: {
            type: 'object',
            properties: {
              b1: {
                type: 'array'
              },
              b2: {
                type: 'array'
              }
            }
          }
        }
      }
      var initialState = {
        errors: {},
        validationResult: {warnings: [], errors: []},
        value: null,
        baseModel: model,
        model
      }
      var newValue = {
        a: {
          b1: [
            {c1: {
              d: null
            }},
            {c2: 12},
            {c3: [1, 2, 3]}
          ],
          b2: []
        }
      }

      var changedState = reducer(initialState, {type: actions.CHANGE_VALUE, value: newValue, bunsenId: null})
      expect(changedState.value).to.eql({a: {b1: [{c1: {}}, {c2: 12}, {c3: [1, 2, 3]}]}})
    })

    it('does not remove required properties from an object', function () {
      var model = {
        type: 'object',
        properties: {
          foo: {
            type: 'object'
          }
        },
        required: ['foo']
      }

      var initialState = {
        errors: {},
        validationResult: {warnings: [], errors: []},
        value: {
          foo: {
            bar: 'baz'
          }
        },
        baseModel: model,
        model
      }

      var storedState = reducer(initialState, {type: actions.CHANGE_VALUE, value: {foo: {}}, bunsenId: null})
      expect(storedState.value).to.eql({foo: {}})
    })

    it('preserves empty objects that are required', function () {
      var initialState = {
        errors: {},
        validationResult: {warnings: [], errors: []},
        value: {
          foo: {
            fooProp: 'test'
          },
          bar: {
            baz: {
              bazProp: 'test'
            }
          }
        },
        baseModel: {
          type: 'object',
          properties: {
            foo: {
              type: 'object'
            },
            bar: {
              type: 'object',
              properties: {
                baz: {
                  type: 'object',
                  properties: {
                    bazProp: {
                      type: 'string'
                    }
                  }
                }
              },
              required: ['baz']
            }
          },
          required: ['foo']
        }
      }

      var changedState = reducer(initialState, {type: actions.CHANGE_VALUE, value: {}, bunsenId: 'foo'})
      expect(changedState.value).to.eql({foo: {}, bar: {baz: {bazProp: 'test'}}})
      changedState = reducer(initialState, {type: actions.CHANGE_VALUE, value: {}, bunsenId: 'bar.baz'})
      expect(changedState.value).to.eql({foo: {fooProp: 'test'}, bar: {baz: {}}})
    })

    it('preserves empty arrays that are required', function () {
      var model = {
        type: 'object',
        properties: {
          foo: {
            type: 'array'
          },
          bar: {
            type: 'object',
            properties: {
              baz: {
                type: 'array',
                item: {
                  type: 'string'
                }
              }
            },
            required: ['baz']
          }
        },
        required: ['foo']
      }

      var initialState = {
        errors: {},
        validationResult: {warnings: [], errors: []},
        value: {
          foo: ['foo item'],
          bar: {
            baz: ['baz item']
          }
        },
        baseModel: model,
        model
      }

      var changedState = reducer(initialState, {type: actions.CHANGE_VALUE, value: [], bunsenId: 'foo'})
      expect(changedState.value).to.eql({foo: [], bar: {baz: ['baz item']}})
      changedState = reducer(initialState, {type: actions.CHANGE_VALUE, value: [], bunsenId: 'bar.baz'})
      expect(changedState.value).to.eql({foo: ['foo item'], bar: {baz: []}})
    })
  })

  describe('can set the validation', function () {
    it('basic functionality', function () {
      var initialState = {
        errors: ['this is broken'],
        validationResult: ['this sucks'],
        value: {},
        baseModel: {}
      }
      var changedState = reducer(initialState, {
        type: actions.VALIDATION_RESOLVED, errors: [], validationResult: ['you look kinda fat']
      })

      expect(changedState).to.eql({
        errors: [],
        lastAction: 'VALIDATION_RESOLVED',
        validationResult: ['you look kinda fat'],
        value: {},
        baseModel: {}
      })
    })
  })
})
