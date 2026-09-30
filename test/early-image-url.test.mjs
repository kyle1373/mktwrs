import test from 'node:test';
import assert from 'node:assert/strict';
import {earlyImageURL} from '../scripts/early-image-url.mjs';

test('retains the Astre result missed by the original Discord image importer', () => {
  const captured = 'https://images-ext-1.discordapp.net/external/qn3_SLkdqcK_OGAKchr5WAeZDddYZu9X4BWj_i56LLQ/https/pbs.twimg.com/media/EroGp8VW4AYdJzM.jpg%3Alarge?format=webp&width=247&height=512';
  assert.equal(earlyImageURL(captured), 'https://pbs.twimg.com/media/EroGp8VW4AYdJzM.jpg:large');
  assert.equal(earlyImageURL(captured), earlyImageURL('https://pbs.twimg.com/media/EroGp8VW4AYdJzM.jpg:large'));
});
test('excludes profile avatars and retains expiring attachment credentials', () => {
  assert.equal(earlyImageURL('https://pbs.twimg.com/profile_images/123/avatar.jpg'), null);
  assert.equal(earlyImageURL('https://media.discordapp.net/attachments/123/456/result.png?ex=abc&hm=xyz&width=200&format=webp'), 'https://media.discordapp.net/attachments/123/456/result.png?ex=abc&hm=xyz');
});
