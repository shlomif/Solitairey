JS_PREFIX = 'js'.freeze
JS_SRC_PREFIX = 'src/js'.freeze
ROOT_PREFIX = 'dest'.freeze
PREFIX = 'dest/js'.freeze
BROWSERIFY_JS = %w[big-integer flatted].freeze
TS_BASE = %w[fcs-validate french-cards prange web-fc-solve--expand-moves
             web-fc-solve].freeze
JS_CURATED_SOURCES = %w[
  agnes
  application
  auto-stack-clear
  auto-turnover
  autoplay
  flowergarden
  fortythieves
  freecell
  golf
  grandclock
  ie-opera-background-fix
  iphone
  klondike
  klondike1t
  montecarlo
  pyramid
  russian-solitaire
  scorpion
  solitaire
  solver-freecell
  solver-freecell-worker
  spider
  spider1s
  spider2s
  spiderette
  statistics
  tritowers
  will-o-the-wisp
  yukon
].freeze
JS = %w[yui-breakout yui-debug require require--debug lodash.custom.min] +
     JS_CURATED_SOURCES + TS_BASE
YUI_DIST = 'yui-unpack/'.freeze
YUI_SRC = 'ext/yui/yui-all-min.js'.freeze
YUI = "#{PREFIX}/yui-all-min.js".freeze
ALL = "#{PREFIX}/all.js".freeze
MINIFIED = "#{PREFIX}/all-min.js".freeze
COMBINED = "#{PREFIX}/combined-min.js".freeze
# COMPRESSOR = "ext/yuicompressor-2.4.2/build/yuicompressor-2.4.2.jar"
COMPRESSOR = 'bin/Run-YUI-Compressor'.freeze
TEMPLATE = 'index.erb'.freeze

IMAGES = Dir['{dondorf,layouts}/**/*.png', '*.{css,gif,png,jpg}'] +
         ['.htaccess']

DEST_INDEX = 'dest/index.html'.freeze
DEST_INDEX_DEV = 'dest/index-dev.html'.freeze
DEST_INDEX_DEV_X = 'dest/index-dev.xhtml'.freeze

def create_index(index, development = false)
  require 'erb'

  File.open(index, 'w') do |f|
    f.write(ERB.new(File.read(TEMPLATE)).result(binding))
  end
end

dest_images = []
IMAGES.each do |img|
  d = "dest/#{img}"
  dest_images << d
  file d => img do
    mkdir_p File.dirname(d)
    cp img.to_s, d.to_s
  end
end

def cpfile(src, dest)
  file dest => src do
    cp src, dest
  end
end

cpfile YUI_SRC, YUI

dest_js_s = []

DIRS = %w[ext/lodash ext/requirejs ext/yui-debug].freeze
def js_pat_file(filename)
  DIRS.map { |d| d + '/' + filename }.select do |f|
    File.file? f
  end [0] || "#{JS_SRC_PREFIX}/#{filename}"
end

def ts_pat_file(filename)
  DIRS.map { |d| d + '/' + filename }.select do |f|
    File.file? f
  end [0] || "src/ts/#{filename}"
end

def fcs_pat_file(filename)
  "ext/libfreecell-solver/#{filename}"
end

def js_js_pat_file(filename)
  js_pat_file(filename + '.js')
end

def fcs_file(filename)
  src = fcs_pat_file(filename)
  dest = "#{PREFIX}/#{filename}"
  cpfile src, dest
  dest
end

def js_file(filename)
  src = js_pat_file(filename)
  dest = "#{PREFIX}/#{filename}"
  cpfile src, dest
  dest
end

def fcs_root_file(filename)
  src = fcs_pat_file(filename)
  dest = "#{ROOT_PREFIX}/#{filename}"
  dest2 = "#{PREFIX}/js/#{filename}"
  cpfile src, dest2
  cpfile src, dest
  dest
end

def js_root_file(filename)
  src = js_pat_file(filename)
  dest = "#{ROOT_PREFIX}/#{filename}"
  dest2 = "#{PREFIX}/js/#{filename}"
  cpfile src, dest2
  cpfile src, dest
  dest
end

def dest_js(base)
  'dest/js/' + base + '.js'
end

dest_css = 'dest/cards.css'
src_css = 'solitairey-cards.scss'

file dest_css => src_css do
  # sh "sass --style compressed #{src_css} #{dest_css}"
  sh "sass #{src_css} #{dest_css}"
end

BROWSERIFY_JS.each do |base|
  dest2 = dest_js(base)
  file dest2 do
    sh "browserify -s #{base} -r #{base} -o #{dest2}"
  end
end

TS_BASE.each do |base|
  dest2 = js_js_pat_file(base)
  src2 = ts_pat_file("#{base}.ts")
  file dest2 => [src2] + BROWSERIFY_JS.map { |x| dest_js(x) } do
    sh 'tsc -p .'
  end
end

src = "ext/#{YUI_DIST}"
dest = "dest/js/#{YUI_DIST}"
file dest => src do
  sh "rsync -a #{src} #{dest}"
  sh "rm -fr #{dest}/yui/{api,docs,releasenotes,tests}"
end
file ALL => dest

JS.each do |fn_base|
  filename = fn_base + '.js'
  dest_js_s << js_file(filename)
end

dest_js_extra = ['libfcs-wrap.d.ts',
                 'libfcs-wrap.js',
                 'libfreecell-solver-asm.js',
                 'libfreecell-solver-asm.js.mem',
                 'libfreecell-solver.js',
                 'libfreecell-solver.js.mem',
                 'libfreecell-solver.min.js'].map { |x| fcs_file(x) }
dest_js_extra += ['libfreecell-solver.js.mem',
                  'libfreecell-solver.wasm'].map { |x| fcs_root_file(x) }

desc 'concatenated solitaire sources'
file ALL => dest_js_s + dest_js_extra do
  File.open(ALL, 'w') do |f|
    JS.each do |filename|
      f.write(File.read(js_js_pat_file(filename)))
    end
  end
end

desc 'minified solitaire sources'
file MINIFIED => ALL do
  sh "#{COMPRESSOR} -o #{MINIFIED} #{ALL}"
end

desc 'concatenated minified solitaire and YUI sources'
file COMBINED => [YUI, MINIFIED] do
  sh "cat #{YUI} #{MINIFIED} > #{COMBINED}"
end

desc 'development file with seperated, unminified source files'
file DEST_INDEX_DEV => TEMPLATE do
  create_index DEST_INDEX_DEV, true
end
file DEST_INDEX_DEV_X => TEMPLATE do
  create_index DEST_INDEX_DEV_X, true
end

desc 'production file with separated, unminified source files'
file DEST_INDEX => [TEMPLATE, COMBINED] do
  # create_index DEST_INDEX
  create_index DEST_INDEX, true
end

T = JS_CURATED_SOURCES.reject { |x| x == 'iphone' }.freeze
task :test do
  sh 'eslint -c .eslintrc.yml ' + T.map { |f| "src/js/#{f}.js" }.join(' ')
  sh 'rubocop Rakefile'
end
task :prettier do
  sh 'prettier --arrow-parens always --tab-width 4 --trailing-comma all ' \
     '--write ' + JS_CURATED_SOURCES.map { |bn| js_js_pat_file(bn) }.join(' ')
end

multitask images: dest_images

task :clean do
  sh "rm -f #{[ALL, MINIFIED, COMBINED, DEST_INDEX, DEST_INDEX_DEV,
               DEST_INDEX_DEV_X].join(' ')}"
end

def myrsync(remote)
  sh "rsync --progress --inplace -a -v dest #{remote}"
end

task upload: :default do
  # myrsync "hostgator:public_html/temp-Solitairey-ekrimyk/"
  # myrsync "hostgator:public_html/temp-Solitairey-fc-solve-loop-NjU78o/"
  myrsync 'hostgator:public_html/temp-Solitairey-fc-solve2/'
  myrsync 'hostgator:public_html/Solitairey--macklop/'
  cond = false
  if cond
    sh 'rsync --progress --inplace -a -v dest ' \
      'hostgator:public_html/temp-Solitairey-ekrimyk/'
  end
  sh 'rsync -a dest/ docs/'
  sh 'git add docs/'
end

task upload_local: :default do
  myrsync '/var/www/html/shlomif/temp-Solitairey/'
end

multitask default: [DEST_INDEX, DEST_INDEX_DEV, DEST_INDEX_DEV_X,
                    :images, dest_css]
