export function applyFinalSourceFidelity(courses, patches) {
  for (const p of patches.rows) {
    const course = courses.find(c => c.id === p.courseId);
    let row = course?.[p.collection]?.find(r => r.id === p.id);
    if (!row && p.restore) {
      course[p.collection].push(structuredClone(p.set));
      continue;
    }
    if (!row || (p.time && row.time !== p.time) || (p.playerId && row.playerId !== p.playerId))
      throw new Error('Final source fidelity mismatch: ' + p.courseId + '/' + p.id);
    Object.assign(row, structuredClone(p.set));
  }
  for (const c of courses) {
    if (c.current) c.current = structuredClone(c.records.find(r => r.id === c.current.id) || c.current);
    c.currentHolders = c.currentHolders.map(r => structuredClone(c.records.find(n => n.id === r.id) || r));
  }
}
