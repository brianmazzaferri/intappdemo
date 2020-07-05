// Require the Bolt package (github.com/slackapi/bolt)
const { App } = require("@slack/bolt");
const Datastore = require("nedb"), //(require in the database)
  // Security note: the database is saved to the file `datafile` on the local filesystem. It's deliberately placed in the `.data` directory
  // which doesn't get copied if someone remixes the project.
  db = new Datastore({ filename: ".data/datafile", autoload: true }); //initialize the database

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: 'my-state-secret',
  scopes: ['commands', 'chat:write', 'chat:write.public', ], //add scopes here
  installationStore: {
    storeInstallation: (installation) => {
//      console.log("INSTALLATION:");
//      console.log(installation);
      return db.insert(installation, (err, newDoc) => {
        if (err) console.log("There's a problem with the database ", err);
        else if (newDoc) console.log("installation insert completed");
      });
    },
    fetchInstallation: async (InstallQuery) => {
//      console.log("FETCH:");
//      console.log(InstallQuery);
      let incomingteam = InstallQuery.teamId;
      let result = await queryOne({"team.id":InstallQuery.teamId});
      console.log(result);
      return result;
    },
  },
});

//LISTENERS GO HERE

app.shortcut("intapp_log_time", async ({ shortcut, ack, context, client }) => {
  try{
    await ack();
    let viewPayload = require("./json/intappmodal");
    const result = await app.client.views.open({
      token:context.botToken,
      trigger_id:shortcut.trigger_id,
      view: viewPayload
    });
  } catch(error){
    console.error(error);
  } 
});

app.view("submitIntapp", async ({ ack, body, view, context }) => {
  try{
    await ack();
    console.log("BODY");
    console.log(body);
    console.log("VIEW");
    console.log(view);
    console.log("VIEW.STATE.VALUES");
    console.log(view.state.values.client.client.selected_option.text.text);
    let blocksContent = require("./json/loggedblocks");
    blocksContent = JSON.stringify(blocksContent).replace("!DATE", view.state.values.workdate.workdate.selected_date);
    blocksContent = blocksContent.replace("!CLIENT", view.state.values.client.client.selected_option.text.text );
    blocksContent = blocksContent.replace("!ENGAGEMENT", view.state.values.engagement.engagement.selected_option.text.text);
    blocksContent = blocksContent.replace("!HOURS", view.state.values.hours.hours.value);
    blocksContent = blocksContent.replace("!NARRATIVE", view.state.values.narrative.narrative.value);
    const result = app.client.chat.postMessage({
      token:context.botToken,
      channel:body.user.id,
      text:"Time logged successfully!",
      blocks: blocksContent
    });

  } catch(error){
    console.error(error);
  }
});

app.shortcut("manage_timers", async ({ shortcut, ack, context, client }) => {
  try{
    await ack();
    let viewPayload = require("./json/managetimers");
    const result = await app.client.views.open({
      token:context.botToken,
      trigger_id:shortcut.trigger_id,
      view: viewPayload
    });
  } catch(error){
    console.error(error);
  } 
});

app.view("submitTimers", async ({ ack, body, view, context }) => {
  try{
    await ack();
  } catch(error){
    console.error(error);
  }
});

app.action("startnewtimer", async ({ack, body, context}) => {
  try {
    await ack();
    let viewPayload = require("./json/newtimer");
    const result = await app.client.views.push({
      trigger_id:body.trigger_id,
      token:context.botToken,
      view_id:body.view.id,
      view: viewPayload
    });
  } catch(error){
    console.error(error);
  }
});

app.view("startTimer", async ({ ack, body, view, context }) => {
  try{
    await ack();
      console.log(view);
      let viewPayload = require("./json/updatedtimerview");
      viewPayload = JSON.stringify(viewPayload).replace("$TITLE$", view.state.values.title.title.value);
      viewPayload = viewPayload.replace("$ENGAGEMENT$", view.state.values.engagement.engagement.selected_option.text.text);
      const result = await app.client.views.update({
        trigger_id:body.trigger_id,
        token:context.botToken,
        view_id:view.root_view_id,
        view: viewPayload
    });
  } catch(error){
    console.error(error);
  }
});

//BOILERPLATE BELOW HERE

//look up any one document from a query string
function queryOne(query) {
  return new Promise((resolve, reject) => {
    db.findOne(query, (err, docs) => {
      if (err) console.log("There's a problem with the database: ", err);
      else if (docs) console.log(query + " queryOne run successfully.");
      resolve(docs);
    });
  });
}

//print the whole database (for testing)
function printDatabase() {
  db.find({}, (err, data) => {
    if (err) console.log("There's a problem with the database: ", err);
    else if (data) console.log(data);
  });
}

//clear out the database
function clearDatabase(team,channel) {
  db.remove({team:team, channel:channel}, { multi: true }, function(err) {
    if (err) console.log("There's a problem with the database: ", err);
    else console.log("database cleared");
  });
}
(async () => {
  // boilerplate to start the app
  await app.start(process.env.PORT || 3000);
  //printDatabase();
  console.log("⚡️ Bolt app is running!");
})();
