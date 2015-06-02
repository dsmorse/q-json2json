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
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
			},
			dist: {
				files: {
					'dist/json2json.min.js': ['dist/json2json.js']
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-coffee');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	// Default task.
	grunt.registerTask('default', ['clean', 'coffee', 'concat', 'uglify']);

};
