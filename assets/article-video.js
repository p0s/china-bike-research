// Article players contact YouTube only after an intentional activation.
// The ordinary watch link stays available even if the external player fails.
export function initArticleVideos(root = document) {
  for (const shell of root.querySelectorAll('[data-article-video]')) {
    const button = shell.querySelector('.video-load-button');
    const fallback = shell.querySelector('.video-load-fallback');
    const id = shell.dataset.articleVideo;
    if (!button || !fallback || !/^[A-Za-z0-9_-]{11}$/.test(id)) continue;
    button.hidden = false;
    fallback.hidden = true;
    button.addEventListener('click', () => {
      if (shell.querySelector('iframe')) return;
      const frame = root.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
      frame.title = shell.dataset.playerTitle;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      button.hidden = true;
      shell.append(frame);
      frame.focus({ preventScroll: true });
    });
  }
}
