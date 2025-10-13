const fs = require('fs-extra');
const path = require('path');
const terser = require('terser');
const CleanCSS = require('clean-css');
const htmlmin = require('html-minifier').minify;
const archiver = require('archiver');

const config = {
    releaseDir: 'release',
    zipName: 'release.zip',
    ignoreList: [
        'node_modules',
        'dist',
        '.git',
        '.gitignore',
        'build.js',
        'README.md',
        'main.js',
        'preload.js',
        'float.html',
        'updater.html',
        'main.js',
        'package.json',
        'package-lock.json'
    ]
};

function getReadableFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function processDirectory(sourceDir, destDir) {
    let totalOriginalSize = 0;
    let totalMinifiedSize = 0;
    
    const entries = await fs.readdir(sourceDir);

    for (const entryName of entries) {
        if (config.ignoreList.includes(entryName) || entryName === config.releaseDir) {
            continue;
        }

        const sourcePath = path.join(sourceDir, entryName);
        const destPath = path.join(destDir, entryName);
        const stats = await fs.stat(sourcePath);

        if (stats.isDirectory()) {
            await fs.ensureDir(destPath);
            const subDirSizes = await processDirectory(sourcePath, destPath);
            totalOriginalSize += subDirSizes.originalSize;
            totalMinifiedSize += subDirSizes.minifiedSize;
        } else if (stats.isFile()) {
            const originalSize = stats.size;
            totalOriginalSize += originalSize;
            let minifiedSize = originalSize;
            let outputContent;

            const ext = path.extname(entryName).toLowerCase();
            const relativePath = path.relative(__dirname, sourcePath);

            try {
                if (ext === '.js') {
                    const code = await fs.readFile(sourcePath, 'utf8');
                    const result = await terser.minify(code, { toplevel: true });
                    if (result.error) throw result.error;
                    outputContent = result.code;
                } else if (ext === '.css') {
                    const code = await fs.readFile(sourcePath, 'utf8');
                    const result = new CleanCSS({ level: 2 }).minify(code);
                    if (result.errors.length > 0) throw new Error(result.errors.join(', '));
                    outputContent = result.styles;
                } else if (ext === '.html') {
                    const code = await fs.readFile(sourcePath, 'utf8');
                    outputContent = htmlmin(code, {
                        collapseWhitespace: true,
                        removeComments: true,
                        minifyJS: true,
                        minifyCSS: true,
                        removeEmptyAttributes: true
                    });
                } else if (ext === '.json') {
                    const code = await fs.readFile(sourcePath, 'utf8');
                    outputContent = JSON.stringify(JSON.parse(code));
                } else {
                    await fs.copy(sourcePath, destPath);
                    totalMinifiedSize += originalSize;
                    console.log(`已复制: ${relativePath}`);
                    continue;
                }

                minifiedSize = Buffer.byteLength(outputContent, 'utf8');
                totalMinifiedSize += minifiedSize;
                await fs.writeFile(destPath, outputContent, 'utf8');

                const reduction = (((originalSize - minifiedSize) / originalSize) * 100).toFixed(2);
                console.log(`已压缩: ${relativePath} | ${getReadableFileSize(originalSize)} -> ${getReadableFileSize(minifiedSize)} (节省 ${reduction}%)`);

            } catch (error) {
                console.error(`处理文件 ${relativePath} 时出错:`, error.message);
                await fs.copy(sourcePath, destPath);
                totalMinifiedSize += originalSize;
            }
        }
    }
    return { originalSize: totalOriginalSize, minifiedSize: totalMinifiedSize };
}

async function build() {
    console.time('构建总耗时');
    const releasePath = path.join(__dirname, config.releaseDir);

    try {
        console.log(`[1/4] 正在清空目标文件夹: ${config.releaseDir}/`);
        await fs.emptyDir(releasePath);

        console.log('[2/4] 正在处理所有文件...');
        const { originalSize: totalOriginalSize, minifiedSize: totalMinifiedSize } = await processDirectory(__dirname, releasePath);

        console.log('\n[3/4] 正在创建 ZIP 压缩包...');
        const zipPath = path.join(releasePath, config.zipName);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.pipe(output);
        archive.directory(releasePath, false, (entry) => {
            return entry.name !== config.zipName ? entry : false;
        });
        
        await new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
            archive.finalize();
        });

        console.log(`ZIP 压缩包已创建: ${path.join(config.releaseDir, config.zipName)}`);

        console.log('\n[4/4] 构建完成！');
        console.log('--- 构建摘要 ---');
        console.log(`所有文件原始总大小: ${getReadableFileSize(totalOriginalSize)}`);
        console.log(`压缩后文件总大小:   ${getReadableFileSize(totalMinifiedSize)}`);
        if (totalOriginalSize > 0) {
            const reductionPercentage = ((totalOriginalSize - totalMinifiedSize) / totalOriginalSize * 100).toFixed(2);
            console.log(`总空间节省百分比:   ${reductionPercentage}%`);
        }
        console.log('----------------');
        console.timeEnd('构建总耗时');

    } catch (error) {
        console.error('\n构建过程中发生严重错误:', error);
        console.timeEnd('构建总耗时');
        process.exit(1);
    }
}

build();