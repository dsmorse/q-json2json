module.exports = function(grunt) {

    'use strict';
	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		lic: grunt.file.read('LICENSE'),

	clean: {
			dist: [
				'dist'
			]
		},
		coffee: {
			compile: {
				files: {
					//'dist/json2json.js': ['lib/*.coffee'] // compile and concat into single file
					'dist/json2json.js': ['lib/TemplateConfig.coffee', 'lib/ObjectTemplate.coffee'] // compile and concat into single file
				}
			}
		},
		meta: {
			banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
			'<%= grunt.template.today("yyyy-mm-dd") %>\n' +
			'<%= pkg.homepage ? "* " + pkg.homepage : "" %>\n' +
			//'* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %>;\n' +
			' <%= lic %> */\n\n'
		},
		concat: {
			options: {
				stripBanners: true,
				banner: '<%= meta.banner %>'
			},
			dist_js: {
				src: ['bower_components/Sysmo/lib/sysmo.js', 'dist/json2json.js'],
				dest: 'dist/json2json.js'
			}
		},
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> - v<%= pkg.version %>  <%= grunt.template.today("dd-mm-yyyy") %> */\n'
			},
			dist: {
				files: {
					'dist/json2json.min.js': ['dist/json2json.js']
				}
			}
		},
		bump: {
			options: {
				files: ['package.json', 'bower.json'],
				updateConfigs: ['pkg'],
				commit: true,
				commitMessage: 'Release v%VERSION%',
				commitFiles: ['package.json', 'bower.json', 'dist/'], // '-a' for all files
				createTag: true,
				tagName: 'v%VERSION%',
				tagMessage: 'Version %VERSION%',
				push: false,
				pushTo: 'origin',
				gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d' // options to use with '$ git describe'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-coffee');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-bump');


	// Default task.
	grunt.registerTask('default', ['clean', 'build']);
	grunt.registerTask('build', ['coffee', 'concat', 'uglify']);

	//use one of the four release tasks to build the artifacts for the release (it will push the docs pages only)
	grunt.registerTask('release:patch', ['clean', 'bump-only:patch', 'build']);
	grunt.registerTask('release:minor', ['clean', 'bump-only:minor', 'build']);
	grunt.registerTask('release:major', ['clean', 'bump-only:major', 'build']);
	grunt.registerTask('release:git',   ['clean', 'bump-only:git', 'build']);

	//use this task to publish the release artifacts
	grunt.registerTask('release:commit', ['bump-commit']);

};
