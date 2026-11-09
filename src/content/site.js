export const site = {
  name: 'Casey Robinson',
  role: 'UX Designer',
  // Short, scannable. Focus areas from my own description of my work.
  intro: 'I focus on interaction models, edge cases, state transitions, microcopy, and system behavior that scales.',
  galleryNote: 'This portfolio is a gallery. Each project is a room where you make the calls I made.',
  bio: 'Human-centered products come from research, design, and empathy. Good design should leave people feeling their lives improved in a concrete way.',
};

// Wix serves resized images through its media service. The raw URL is the
// full-resolution original, used as a fallback.
export function wixImage(id, width = 1600) {
  return `https://static.wixstatic.com/media/${id}/v1/fit/w_${width},h_${width},al_c,q_85,enc_auto/${id.split('~')[0]}.jpg`;
}
export function wixOriginal(id) {
  return `https://static.wixstatic.com/media/${id}`;
}
