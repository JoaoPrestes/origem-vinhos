import { describe, it, expect } from 'bun:test';
import React from 'react';
import { ChatDrawer } from '../../src/web/components/ChatDrawer';

describe('ChatDrawer Frontend Component (spec09 §9 & BDD Cenário 6)', () => {
  it('should export ChatDrawer component properly', () => {
    expect(ChatDrawer).toBeDefined();
    expect(typeof ChatDrawer).toBe('function');
  });

  it('should instantiate the component element with props', () => {
    const element = React.createElement(ChatDrawer, {
      currentUser: { id: 'user-1' },
      onAddToCartSuccess: () => {},
      onNavigateToAuth: () => {},
    });

    expect(element).toBeDefined();
    expect(element.type).toBe(ChatDrawer);
    expect(element.props.currentUser.id).toBe('user-1');
  });
});
