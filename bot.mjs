import TelegramBot from "node-telegram-bot-api";
import cron from 'node-cron'; // for handle cron expressions every minute
import cronParser from 'cron-parser'; // parse the cron expressions to compare them with the current date
import { google } from 'googleapis';

const botToken = "6849664260:AAHAZOLoZpJVAcjPqwH31sXeQVG8k_ZEIGw"; // Replace with your bot token @test_samad_2002_bot
const bot = new TelegramBot(botToken, { polling: true });
const trackedUsers = [];  // Array to store users ID
const usersPhotosDict = {}; // dictionnaire id : userid    value : list of phototoUrls

bot.on('polling_error', err => console.log(err));

bot.onText(/\/score/, async (msg) => {
  const userId = msg.from?.id;
  const score = await getScore(userId);
  let scoreMessage = "your total score is : ";
  scoreMessage += score
  bot.sendMessage(userId, scoreMessage);
});

bot.onText(/\/start/, async (msg) => {
  const userId = msg.from?.id;
  if (!trackedUsers.includes(userId)) { 
    trackedUsers.push(userId); 

    const { username, first_name: firstName, last_name: lastName } = msg.from;
    let welcomeMessage = " Wlecome ";
    let welcomeMessage2 = " Glad to see you in our Atqin Bot ";
    if (lastName) { welcomeMessage += firstName + " " + lastName; } else { welcomeMessage += firstName; }  
    bot.sendMessage(userId, welcomeMessage);
    setTimeout(async () => { bot.sendMessage(userId, welcomeMessage2); }, 800);

    if (!usersPhotosDict.hasOwnProperty(userId)) {
      bot.getUserProfilePhotos(userId).then(async (response) => {
        const photos = response.photos;
        const promises = [];
        photos.forEach((photo, photoIndex) => {
          const fileId = photo[2].file_id;
          const promise = bot.getFile(fileId).then((fileInfo) => {
            const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;
            return fileUrl;
          });
          promises.push(promise);
        });
        Promise.all(promises).then((photoUrlsList) => {
          usersPhotosDict[userId] = photoUrlsList;
          const profilePhotosString = photoUrlsList.join(', '); 
          const userData = {
            userId: userId,
            score: 0,
            username: username,
            firstName: firstName,
            lastName: lastName,
            profilePhotos: profilePhotosString
          };
          insertUser(userData); // Insert user data after all photo URLs are fetched
        }).catch((error) => {
            console.error('Error fetching photo URLs:', error);
        });
      }).catch((error) => {
          console.error('Error fetching user profile photos:', error);
      });
    
    }
  }
});

const clientEmail = 'abdessamed@test-sheet-417911.iam.gserviceaccount.com';
const privateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCsYrw/yFOt+FA6\nRKETArDkHC6G4lTp8BUU8nGQCCfHkVoGq7CddLgah98gLMk7mq9OvFPEbXIqQoqb\nhhYCsjuD2mmf5m2u1TzWyCI5WarJUudQrvRDsNekms75ldPue2TrQyHWiJQQFbro\n5pWuB/hDTtjca/BrzvZT/+/OlLqHnz1nksy7Ys1b90LLGGFDqSW5tnJuqgQIFPmW\n73r4VwkuQQmkAAb4KShl9lG4q8s/EkYhcMDCHjofRtrhuehGvwdL693u2EEDGOq2\nd2DVnIlla7rK+bG7WQKEl5gaZkeCW1xsJM2VrYB/uGzXz6lwpS0ETEkJBCSjoRYB\ndlfNhf2bAgMBAAECggEAMzIplUnB7FdkQEHUkohIj559BOsf69A0+qEcL/n0EnVt\nBrEjxUd+S8bRccVLSEvix5/vwtT8RGe5sYGrdMaJHVoW53mwVm2W4XTTkTO7oIni\nD9i9y4KwMH8XfBFOvTNhX+tyl7u9OV+ywGuGxYYxaY/3oNLftqzjBERs7G3ITfFz\nbvpfZsot7cJAlkA+XTyi1KIDA7hJ4Q3OoMqVAsUnaXplPgUfXngammOe17W0p3fu\niDzId9UUp+A6MasqGvbAONQLSM+1WflwDzqOx4TiVjTJBygXC3zVt55bOnb0gWbs\n/aRP0PMp9l+o7jB/ysz1zKtIKu9RbiW0eIiwfKKuTQKBgQDx1jM7d9jY7t/l7WvN\n+A2cvlX1QFDPEHtV+FHUlg1NtaP5DjxDqfLj92vh99fnBj8rmGWZkXN6xtQdEJxi\nvgUCFb2mDDka6YbKHScxqqUbInLhJbxnxh3PbHXk+rewXlRzKyv3sIHRiSPk5ACB\nfpVJSa4Gx5+WRP5ypNV6OrSt3QKBgQC2e0XFDrj/479BByWvYHsolNOPpQJe4ybR\ntK75jRrYv2KExzbq13mnpMYEClhDaBufKor+7zK6YzBkIQ2wR3HKB4swA+Kgk5sB\nSv/wUpgFouMvNJIdijH1ABm3y50BZc/PDW9ts5/MOJ5xvT7iCMsctI9ssK+EDu1q\nvgrsTObN1wKBgHrJkgugpyZF6sJ4UKMsTeUGsugp9p2btbOJuCqi4TBSiGW895Y3\nZM6gYlNCHon7HvnIj9VwB10QNMRpGa384tgTJ852KExkw349XRgXl2r2i7OLEGT0\nL1CQti9DqR5QVrp+8fz5zoAQDHx701HsbmnekhB5LKsEbtjQnl9IDVK1AoGAL6FJ\ner/3BcOaXgzRh081lkgSWIIHdmDv9vikWzq7cSuzOVkOOon3lQxrKw7QLvfzjb36\n/cPNh9zv+pKuEf7z8nm5mNTKyIL+iH3dBAtq5r23ctDT+qXhmENocxLQblb2wOKO\n3SFvaky0/pcY3MLS0TFH5mTPyzZiPeRQ0ZDZBY0CgYB3eC48l5et8XpB/8WhDHq4\nNYnbhj1O9kF3gEgXqrwCbrJxbadK8OkjcuR4X3044tWIkH7XOzLoXWhbVaSllICT\n5Jr5BQJnqXuGv+OcKDxR7dMf0mPwW4MXdvGonds5GdpaoZOubv2K7WNyBYG/NoPa\nRiVrA1dwq4D4yDnjPBNWvg==\n-----END PRIVATE KEY-----\n';
const googleSheetId = '1JPhRpRcvJitSedGsBsaAYq0WL21MHLkTo1WtN1an5sw';
const googleSheetPage = 'task';
const userSheetID = '120FOobGTJ5gIaghc6nEdY3wZh9lNqQ3O46vOIhVNfro';
const userSheetName = 'user';

async function authenticate() {
  const client = new google.auth.JWT(
    clientEmail,
    null,
    privateKey.replace(/\\n/g, '\n'),
    'https://www.googleapis.com/auth/spreadsheets'
  );
  await client.authorize();
  return google.sheets({ version: 'v4', auth: client });
}

async function insertUser(userData) {
  try {
    const sheets = await authenticate();
    const newRow = [
      userData.userId.toString(),
      userData.score.toString(),
      userData.username,
      userData.firstName,
      userData.lastName,
      userData.profilePhotos,
    ];
    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId: userSheetID,
      range: userSheetName,
      valueInputOption: 'RAW',
      resource: { values: [newRow] },
    });
  } catch (error) {
    console.error('Error inserting user:', error);
  }
}

async function updateSheet(id) {
  try {
    const sheets = await authenticate();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: userSheetID,
      range: userSheetName, // Adjust the range here
    });
    const values = response.data.values;
    if (values.length) {
      const updatedValues = values.map(row => {
        if (row[0] === id.toString()) {
          const updatedScore = parseInt(row[1]) + 1;
          return [id.toString(), updatedScore]; // Reorder if necessary
        }
        return row;
      });
      // Update the range with the modified values
      const updateResponse = await sheets.spreadsheets.values.update({
        spreadsheetId: userSheetID,
        range: userSheetName, // Adjust the range here
        valueInputOption: 'RAW',
        resource: { values: updatedValues },
      });
    } else {
      console.log('No data found in the sheet.');
    }
  } catch (error) {
    console.error('Error updating sheet:', error);
  }
}
async function getScore(id) {
  try {
    const sheets = await authenticate();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: userSheetID,
      range: userSheetName,
    });
    const values = response.data.values;
    if (values.length) {
      // Find the row with the matching ID
      const userRow = values.find(row => row[0] === id.toString());
      return userRow[1];
    }
  } catch (error) {
    console.error('Error retrieving score:', error);
    return null;
  }
}
// CronJob
function dateTimeMatches(date, currentDate) {
  const currentDateS = currentDate.toISOString().substring(0, 16);// Truncate seconds and milliseconds
  const dateS = date.toISOString().substring(0, 16);
  return dateS === currentDateS; // Check if the current date and time matches any date and time in the list
}
function timeMatches(expression, date) {
  const interval = cronParser.parseExpression(expression);
  const data = interval.fields;
  if (!data.minute.includes(date.getMinutes())) {
    return false;
  }
  if (!data.hour.includes(date.getHours())) {
    return false;
  }
  if (!data.dayOfMonth.includes(date.getDate())) {
    return false;
  }
  if (!data.month.includes(date.getMonth() + 1)) {
    return false;
  }
  if (!data.dayOfWeek.includes(date.getDay())) {
    return false;
  }
  return true;
}
function dateToCronExpression(date) {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const cronExpression = `${minute} ${hour} * * *`;
  return cronExpression;
}

cron.schedule('* * * * *', async () => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetId}/values/A1:E100?key=AIzaSyAKKxJPhThyaV0XGuW9wITrhiGRsud65gU`;
  const tasks = []; // Define an array to store tasks
  const repeatedTasks = {} // Dict for repeated tasks
  const response = await fetch(url);
  const data = await response.json();
  for (let i = 1; i < data.values.length; i++) { // Iterate over the values and create task objects
    const taskDetails = data.values[i];
    const startDate = new Date(taskDetails[1]); // Assuming startDate is already defined
    const task = {
      name: taskDetails[0],
      startDate: startDate,
      type: taskDetails[2],
      repeat: taskDetails[3]
    };
    tasks.push(task);
  }

  tasks.forEach(task => {
    if (task.repeat == "TRUE") {
      const cronExpression = dateToCronExpression(task.startDate);
      repeatedTasks[cronExpression] = task.name;
    }
  })
  const currentDate = new Date();
  Object.keys(repeatedTasks).forEach(cronExpression => {
    if (timeMatches((cronExpression), currentDate)) { 
      trackedUsers.forEach(userId => {
        const options = {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Done', callback_data: `done_` }]
            ]
          }
        };
        bot.sendMessage(userId, repeatedTasks[cronExpression], options);
      });
    }
  });

  tasks.forEach(task => {
    if (dateTimeMatches(task.startDate, currentDate) && task.repeat === "FALSE") {
      if (task.type == 'image') {
        trackedUsers.forEach(userId => {
          const options = {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Done', callback_data: `done_` }]
              ]
            }
          };
          bot.sendPhoto(userId, task.name, options);
        });
      }
      else if (task.type == 'text') {
        trackedUsers.forEach(userId => {
          const options = {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Done', callback_data: `done_` }]
              ]
            }
          };
          bot.sendMessage(userId, task.name, options);
        });
      }
      else if (task.type == 'link') {
        trackedUsers.forEach(userId => {
          const options = {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Done', callback_data: `done_` }]
              ]
            }
          };
          bot.sendMessage(userId, task.name, options);
        });
      }
    }
  })
});
// Listen for button clicks
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  const currentDate = new Date();
  // Check if the button indicates a task is done
  if (data.startsWith('done_')) { //  && currentDate < task.endDate
    await updateSheet(userId);
    // Remove the existing inline keyboard
    const options = {
      reply_markup: JSON.stringify({
        remove_keyboard: true
      })
    };
    // Edit the message to remove the existing inline keyboard
    bot.editMessageReplyMarkup({}, {
      chat_id: callbackQuery.message.chat.id,
      message_id: callbackQuery.message.message_id,
      reply_markup: options.reply_markup
    });
    // Send a new message to inform about the task completion
    const messageText = ' Perfect, You have finished the task!';
    bot.sendMessage(callbackQuery.message.chat.id, messageText);
  }
});
