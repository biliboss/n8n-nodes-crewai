const path = require('path');
const { task, src, dest, watch, series } = require('gulp');

const NODE_GLOB = 'nodes/**/*.{png,svg}';
const NODE_DEST = path.resolve('dist', 'nodes');

function copyIcons() {
	return src(NODE_GLOB, { base: '.' }).pipe(dest('dist'));
}

function watchIcons() {
	return watch([NODE_GLOB], series(copyIcons));
}

task('build:icons', copyIcons);
task('watch:icons', series(copyIcons, watchIcons));
