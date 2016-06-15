Togetheroo Code Sample
======================

This repository is a code sample of the Togetheroo web app that I built for a client. The live version of the app can be found [here](https://togetheroo.com/playspace/).

Togetheroo is closed-source, so only a sample is being made available here for portfolio purposes. The sample is incomplete and will not be runnable. Below is the full project structure. Sample files from key areas are left intact to show the web application architecture.

```
.
├── gulpfile.js
├── build/ (folder where the site is built and served)
└── src/
    ├── app-assets/ (sounds, images, physics, etc. for apps)
		├── images/ (images for the site)
    ├── sass/
    ├── playspace-html/ (AJAX HTML fragments that individual apps need)
    └── js/
        ├── main.js (entry point for all JS)
				├── libs/ (bootstrap, jquery, etc.)
        └── apps/ (app-specific JS)
```
