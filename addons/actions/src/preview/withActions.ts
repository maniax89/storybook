// Based on http://backbonejs.org/docs/backbone.html#section-164
import { document, Element } from 'global';
import { useEffect } from '@storybook/client-api';
import deprecate from 'util-deprecate';
import dedent from 'ts-dedent';

import { makeDecorator } from '@storybook/addons';
import { actions } from './actions';

import { PARAM_KEY } from '../constants';

const delegateEventSplitter = /^(\S+)\s*(.*)$/;

const isIE = Element != null && !Element.prototype.matches;
const matchesMethod = isIE ? 'msMatchesSelector' : 'matches';

const root = document && document.getElementById('root');

const hasMatchInAncestry = (element: any, selector: any): boolean => {
  if (element[matchesMethod](selector)) {
    return true;
  }
  const parent = element.parentElement;
  if (!parent) {
    return false;
  }
  return hasMatchInAncestry(parent, selector);
};

const createHandlers = (actionsFn: (...arg: any[]) => object, ...handles: any[]) => {
  const actionsObject = actionsFn(...handles);
  return Object.entries(actionsObject).map(([key, action]) => {
    const [_, eventName, selector] = key.match(delegateEventSplitter);
    return {
      eventName,
      handler: (e: { target: any }) => {
        if (!selector || hasMatchInAncestry(e.target, selector)) {
          action(e);
        }
      },
    };
  });
};

const applyEventHandlers = (actionsFn: any, ...handles: any[]) => {
  useEffect(() => {
    if (root != null) {
      const handlers = createHandlers(actionsFn, ...handles);
      handlers.forEach(({ eventName, handler }) => root.addEventListener(eventName, handler));
      return () =>
        handlers.forEach(({ eventName, handler }) => root.removeEventListener(eventName, handler));
    }
    return undefined;
  }, [root, actionsFn, handles]);
};

const applyDeprecatedOptions = (actionsFn: any, options: any[]) => {
  if (options) {
    deprecate(
      () => applyEventHandlers(actionsFn, options),
      dedent`
        withActions(options) is deprecated, please configure addon-actions using the addParameter api:
        
        addParameters({
          actions: {
            handles: options
          },
        });
      `
    )();
  }
};

export const withActions = makeDecorator({
  name: 'withActions',
  parameterName: PARAM_KEY,
  skipIfNoParametersOrOptions: true,
  allowDeprecatedUsage: true,
  wrapper: (getStory, context, { parameters, options }) => {
    applyDeprecatedOptions(actions, options as any[]);

    if (parameters && parameters.handles) applyEventHandlers(actions, ...parameters.handles);

    return getStory(context);
  },
});
