import test from 'node:test';
import assert from 'node:assert/strict';
import {tourRecordingComparison} from '../lib/video.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';

test('London report-only recordings use the tour rollover without assigning a finish clock', () => {
 const run=(id,submittedAt)=>({id,submittedAt,timeCs:6046,time:'1:00.46',playerId:'astre',video:'https://x.com/Astre_HD/status/1202163109722492928',videoVerified:true});
 const included=run('included','2019-12-04T09:44:08Z');
 const comparison=tourRecordingComparison({submissions:[run('before','2019-12-04T05:59:59Z'),included,run('after','2019-12-18T06:00:00Z')]},'tour-6','2019-12-04','2019-12-18');
 assert.equal(comparison.documentedRecording.id,'included');
 assert.equal(comparison.documentedRecording.achievedAt,undefined);
 assert.equal(isReviewedOpeningDay(included,'2019-12-04'),true);
 assert.equal(isReviewedOpeningDay(run('next','2019-12-05T06:00:00Z'),'2019-12-04'),false);
 assert.equal(isReviewedOpeningDay({submittedAt:'2019-10-23T12:00:00Z'},'2019-10-23'),false);
});
