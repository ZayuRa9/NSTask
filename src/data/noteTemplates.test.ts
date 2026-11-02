import test from 'node:test';
import assert from 'node:assert/strict';
import { NOTE_TEMPLATES } from './noteTemplates';

test('NOTE_TEMPLATES has 5 predefined, structured templates', () => {
  assert.ok(NOTE_TEMPLATES.length >= 5);
  const ids = NOTE_TEMPLATES.map((t) => t.id);
  assert.ok(ids.includes('meeting_minutes'), 'Has meeting minutes template');
  assert.ok(ids.includes('weekly_plan'), 'Has weekly plan template');
  assert.ok(ids.includes('quick_idea'), 'Has quick idea template');
  assert.ok(ids.includes('daily_standup'), 'Has daily standup template');
  assert.ok(ids.includes('eisenhower_matrix'), 'Has Eisenhower matrix template');
});

test('each template has valid title, markdown headings, and labels', () => {
  for (const tpl of NOTE_TEMPLATES) {
    assert.ok(tpl.name && tpl.name.length > 0);
    assert.ok(tpl.defaultTitle && tpl.defaultTitle.length > 0);
    assert.ok(tpl.defaultContent && tpl.defaultContent.includes('# '), `${tpl.id} has markdown H1 heading`);
    assert.ok(Array.isArray(tpl.defaultLabels) && tpl.defaultLabels.length > 0);
    if (tpl.checklistItems) {
      assert.ok(Array.isArray(tpl.checklistItems));
      assert.ok(tpl.checklistItems.length > 0);
    }
  }
});
