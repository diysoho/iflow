import React, { Component, Children } from 'react'
import be from 'be-type'
import Provider from './provider'

export default function createProvider (initDistributor = {}, {
  immutable = true,
  withRef = true,
  middleware = []
} = {}) {
  const register = new Map()
  const subscriber = new Set()
  let rootState = initDistributor
  const broadcast = (register, nextState) => {
    register.forEach(noticeWillUpdate => noticeWillUpdate(nextState))
  }
  const insert = (registry) => {
    rootState = {...rootState, ...registry}
    Object.entries(registry).forEach(([key, pipes]) => {
      Object.entries(pipes).forEach(([pipeKey, pipe]) => {
        if (be.function(pipe)) {
          rootState[key][pipeKey] = function (...params) {
            middleware.forEach((applyMiddleware) => {
              applyMiddleware({
                key,
                pipeKey,
                params
              }, rootState[key], rootState)
            })
            const fn = pipe.bind(rootState[key], ...params)
            if (immutable) {
              const nextState = fn(rootState[key], rootState)
              if (nextState && rootState[key] !== nextState) {
                rootState[key] = nextState
              } else {
                throw new Error(`
                  Iflow is set to '{immutable: true}', 
                  function pipe return result is expected to be a new state object.
                `)
              }
            } else {
              const nextState = {...rootState[key]}
              fn(nextState, rootState)
              rootState[key] = {...nextState}
            }
            rootState = {...rootState}
            broadcast(register, rootState)
            subscriber.forEach(listener => listener(rootState))
            return this
          }
        }
      })
    })
  }
  insert(rootState)
  // const distributor = ({
  //     registry,
  //     selector = (rootState) => ({...rootState}), // TODO:  use memoize?
  //     updated
  //   } = {}) => {
  //   if (registry) {
  //     insert(registry)
  //   }
  //   return (TargetComponent) => {
  //     class Clazz extends Component {
  //       static WrappedComponent = TargetComponent
  //
  //       constructor (...args) {
  //         super(...args)
  //         this.registerSymbol = Symbol()
  //         register.set(this.registerSymbol, this.noticeWillUpdate.bind(this))
  //         this.currentState = selector(rootState, this.props)
  //         this.setWrappedInstance = this.setWrappedInstance.bind(this)
  //       }
  //
  //       setWrappedInstance (ref) {
  //         this.wrappedInstance = ref
  //       }
  //
  //       mergeProps () {
  //         return {
  //           ...this.props,
  //           ...this.currentState,
  //         }
  //       }
  //
  //       getProps () {
  //         const props = this.mergeProps()
  //         if (withRef) {
  //           props.ref = this.setWrappedInstance
  //         }
  //         return props
  //       }
  //
  //       noticeWillUpdate (nextRootState) {
  //         const nextState = selector(nextRootState, this.props)
  //         if (!equal(this.currentState, nextState)) {
  //           this.currentState = nextState
  //           return this.forceUpdate(updated)
  //         }
  //       }
  //
  //       componentWillUnmount () {
  //         register.delete(this.registerSymbol)
  //       }
  //
  //       render () {
  //         const props = this.getProps()
  //         return <TargetComponent {...props}/>
  //       }
  //     }
  //
  //     return hoistStatics(Clazz, TargetComponent)
  //   }
  // }
  // rootState.subscribe = (listener) => {
  //   return subscriber.add(listener)
  // }
  // rootState.unsubscribe = (listener) => {
  //   return subscriber.delete(listener)
  // }
  const store = {
    rootState,
    register,
    subscriber,
    immutable,
  }
  return (
    (props) => (
      <Provider store={store}>
        {props.children}
      </Provider>
    )
  )
}