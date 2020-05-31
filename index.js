const axios = require('axios');

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  app.on('issues.opened', async context => {
    console.log('=========== context', context);
    const issueComment = context.issue({ body: 'Thanks for opening this issue!' })
    return context.github.issues.createComment(issueComment)
  })

  app.on('issues.reopened', async context => {
    const { data } = await axios.get('https://api.github.com/repos/timowang1991/probot-webhook-test/contents/README.md');
    // console.log('===== data', data);

    const blob = await context.github.git.getBlob({
      owner: 'timowang1991',
      repo: 'probot-webhook-test',
      file_sha: data.sha,
    });

    const blobData = Buffer.from(blob.data.content, 'base64').toString();

    const { data: masterRefData } = await context.github.git.getRef({
      owner: 'timowang1991',
      repo: 'probot-webhook-test',
      ref: 'heads/master'
    })

    const newBranchName = `new-ref${new Date().getTime()}`;
    const newRef = await context.github.git.createRef({
      owner: 'timowang1991',
      repo: 'probot-webhook-test',
      ref: `refs/heads/${newBranchName}`,
      sha: masterRefData.object.sha,
    });

    const { data: branchData } = await context.github.repos.getBranch({
      owner: 'timowang1991',
      repo: 'probot-webhook-test',
      branch: newBranchName
    });

    const { data: treeData } = await context.github.git.getTree({
      owner: 'timowang1991',
      repo: 'probot-webhook-test',
      tree_sha: branchData.commit.commit.tree.sha
    });

    // console.log('======= treeData', JSON.stringify(treeData, null, 4));

    // const { data: newBlobData } = await context.github.git.createBlob({
    //   owner: 'timowang1991',
    //   repo: 'probot-webhook-test',
    //   content: `${blobData}\nthird line`,
    // });

    const { data: newTreeData } = await context.github.git.createTree({
      owner: 'timowang1991',
      repo: 'probot-webhook-test',
      tree: [
        ...treeData.tree.filter((object) => object.path !== 'README.md'),
        {
          path: 'README.md',
          type: 'blob',
          mode: '100644',
          content: `${blobData} <br/> third line`,
          // sha: newBlobData.sha
        }
      ]
    })

    // console.log('======= newTreeData', newTreeData);

    const { data: commitData } = await context.github.git.createCommit({
      owner: 'timowang1991',
      repo: 'probot-webhook-test',
      tree: newTreeData.sha,
      parents: [branchData.commit.sha],
      message: 'my new commit to readme',
    });

    // console.log('======= commit', JSON.stringify(commitData, null, 4));

    const updatedRef = await context.github.git.updateRef({
      owner: 'timowang1991',
      repo: 'probot-webhook-test',
      ref: `heads/${newBranchName}`,
      sha: commitData.sha,
    })

    console.log('======= updatedRef', updatedRef);

    const pullRequest = await context.github.pulls.create({
      owner: 'timowang1991',
      repo: 'probot-webhook-test',
      title: 'onboard',
      head: newBranchName,
      base: 'master',
    });
  })

  app.on('push', context => {
    // console.log('========== push context', context);
  })

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
