import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

import { useEffect, useState } from 'react'

import git from 'isomorphic-git'
import {plugins, clone, commit, push} from 'isomorphic-git'

import http from 'isomorphic-git/http/web'

import LightningFS from '@isomorphic-git/lightning-fs'
var path = require('path')

export default function Home() {

  const [gitRepoURL, setGitRepoURL] = useState('https://github.com/grayhatdevelopers/grammarly-bot-test')
  const [rootdir, setRootDir] = useState(false);
  const [dir, setDir] = useState('/');
  const [directoryFiles, setDirectoryFiles] = useState([]);

  useEffect(() => {

    if (typeof window !== 'undefined'){
    const initFS = async () => {
      console.log("LightningFS:", LightningFS);
      // Initialize isomorphic-git with a file system
      window.fs = new LightningFS('fs')
      // I prefer using the Promisified version honestly

      // TODO: turn this into a hook
      window.pfs = window.fs.promises
  
      console.log(dir);
      // await pfs.mkdir(dir);
      // Behold - it is empty!
      let directoryFiles = await pfs.readdir(dir);
      console.log("directoryFiles BEFORE:", directoryFiles);

      setDirectoryFiles(directoryFiles);

      if (!rootdir){
        await git.clone({
          fs,
          http,
          dir,
          corsProxy: 'https://cors.isomorphic-git.org',
          url: gitRepoURL,
          ref: 'main',
          singleBranch: true,
          depth: 10,
          force: true,
        });
        setRootDir(true);
      }
      
      // // Now it should not be empty...
      // directoryFiles = await pfs.readdir(dir);
      // console.log("directoryFiles AFTER:", directoryFiles);

      // setDir(dir);
    }  

    const cloneRepo = async () => {
      await git.clone({
        fs,
        http,
        dir,
        corsProxy: 'https://cors.isomorphic-git.org',
        url: 'https://github.com/isomorphic-git/isomorphic-git',
        ref: 'main',
        singleBranch: true,
        depth: 10,
        force: true,
      });
      
      // Now it should not be empty...
      await pfs.readdir(dir);
    }
    initFS();
  }

  }, [])

  const [content, setContent] = useState();

  const [stattedDir, setStattedDir] = useState([]);

  useEffect(() => {
    async function getDirectoryFiles () {
      let directoryFiles = await pfs.readdir(dir);
      console.log("getDirectoryFiles:", directoryFiles);

      setDirectoryFiles(directoryFiles);
    }
    async function getContent () {
      let content = await pfs.readFile(dir, 'utf8');
      console.log("getContent:", content);

      setContent(content);
    }
    console.log("stattedDir:", stattedDir);
    if (stattedDir.stats){
      if (stattedDir.stats.type === 'dir') {
        getDirectoryFiles();
      }
      else if (stattedDir.stats.type === 'file'){
        getContent();
      }
    }
  }, [stattedDir]);


  useEffect(() => {
    async function getDirStats() {
      setStattedDir({
        name: dir, 
        stats: await pfs.stat(dir)
      })
    }

    if (dir) getDirStats();
  }, [dir])

  const [stattedFiles, setStattedFiles] = useState([]);

  useEffect(() => {
    async function renderDuration (x) {
      // console.log("x:" , {...x})
      var _filepath = path.join(dir, x.toString());
      return await pfs.stat(_filepath);
  }

  async  function getStats(directoryFiles, setDirectoryFiles) {
    let stattedDirectoryFiles = directoryFiles.map((name) => {
      return {
      name: name
    }});
    for (let i=0; i<directoryFiles.length; i++) {
      stattedDirectoryFiles[i].stats = await renderDuration(directoryFiles[i]);
    }
    setDirectoryFiles(stattedDirectoryFiles);
    return stattedDirectoryFiles;
  }

  console.log("directoryFiles reactive listener: ", directoryFiles);
  if (directoryFiles) {
    getStats(directoryFiles, setStattedFiles);
  }
  }, [directoryFiles]);

  // Update :

  async function replaceRepo () {
    if (typeof window === "undefined") return;
    var deleteFolderRecursive = async function(_path) {
        var files = await pfs.readdir(_path)
        files.forEach(async function(file,index){
          var curPath = path.join(_path, file);
          var _stat = await pfs.stat(curPath)
          if(_stat.type === "dir") { // recurse
            deleteFolderRecursive(curPath);
          } else { // delete file
            await pfs.unlink(curPath);
          }
        });
        await pfs.rmdir(_path);
    };

    // let directoryFiles = await pfs.readdir(dir);
    // for (let i=0; i<directoryFiles.length; i++) {
    //   // try {
    //     // await pfs.unlink(path.join(dir, directoryFiles[i]));
    //     await pfs.rmdir(path.join(dir, directoryFiles[i]), { recursive: true, force: true })
    //   // }
    //   // catch {
    //   //   await pfs.rmdir(directoryFiles[i])
    //   // }
    // }

    deleteFolderRecursive("/");
    // await pfs.rm(path, { recursive: true, force: true })

    setDir("/")
    await git.clone({
        fs,
        http,
        dir: "/",
        corsProxy: 'https://cors.isomorphic-git.org',
        url: gitRepoURL,
        ref: 'main',
        singleBranch: true,
        depth: 10,
        force: true,
    });
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>

        <p className={styles.description}>
          <form onSubmit={(e) => {
            e.preventDefault();
            replaceRepo();

          }}>
          <input type="text" placeholder='Enter the link to your GitHub repo' value={gitRepoURL} onChange={(e) => setGitRepoURL(e.target.value)} className={styles.code}/>
          <input type="submit" className={styles.code} />

          </form>
        </p>

        <a onClick={() => {
                setDir(path.join(dir, "../"));
              }} className={styles.card}>
                <h2>&larr; .. </h2>
                {/* <p>Find in-depth information about Next.js features and API.</p> */}
          </a>  

        {
          stattedDir?.stats?.type === 'dir' ? 
        <div className={styles.grid}>
          {
            dir && stattedFiles.length ? 
            stattedFiles.map((file) => {
              console.log("file.name", file.name);
              return (<a onClick={() => {
                setDir(path.join(dir, file.name));
              }} className={styles.card}>
                <h2>{file.name} {file.stats.type === 'dir' ? <>&rarr;</> :""}</h2>
                {/* <p>Find in-depth information about Next.js features and API.</p> */}
              </a>  
                )
            })
            :
            <>No files.</>
          }
          
          
        </div>
        :
        <p style={{
          whiteSpace: "pre-wrap",
        }}>{content}</p>
      }

      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  )
}
