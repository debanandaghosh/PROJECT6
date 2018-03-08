/* jshint esversion: 6 */
require('dotenv-extended').load();
require('dotenv').config();
const restify = require('restify');
const fs = require('fs');
const builder = require('botbuilder');
const azureSearch = require('./azureSearchApiClient');
const listenPort = process.env.port || process.env.PORT || 3978;
/*const azureSearchQuery = azureSearch({
    searchName: 'smrtsearchoct',
    indexName: 'smrtnewindex',
    searchKey: 'B5AEF7341B28CE3DECA26CD36ACD28D8'
});*/

const azureSearchQuery = azureSearch({
    searchName: process.env.AZURE_SEARCH_ACCOUNT,
    indexName: process.env.AZURE_SEARCH_INDEX,
    searchKey: process.env.AZURE_SEARCH_KEY
});

var azure = require('azure-storage');
var intents = new builder.IntentDialog();

var applicationInsights = require("applicationinsights");
var telemetry = new applicationInsights.TelemetryClient("");
const server = restify.createServer();
server.listen(listenPort, () => {
    console.log('%s listening to %s', server.name, server.url);
});
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());
var bot = new builder.UniversalBot(connector, (session, args, next) => {
  
    telemetry.trackEvent({ name: "none" });
    session.endDialog(`I'm sorry, I did not understand '${session.message.text}'.\n Is there something else you'd like to ask from Rule book #4? :)`);
});

var luisRecognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL).onEnabled(function (context, callback) {
    var enabled = context.dialogStack().length === 0;
    callback(null, enabled);
});
bot.recognizer(luisRecognizer);

bot.dialog('greetings',
    (session, args, next) => {
        var card = createAnimationCard(session);
        var msg = new builder.Message(session).addAttachment(card);
      session.send(msg);
    //    var telemetry = applicationInsights.defaultClient;
        telemetry.trackEvent({ name: "greetings" });
        session.send(`Hey there! I'm the SMaRT bot. I can help you with your training materials - Rule book #4`);
        session.endDialog('You can ask me questions like \'What\'s the role of HSM?');
        session.send(luisRecognizer.recognizer);

    }
).triggerAction({
    matches: 'greetings'
    });
function createAnimationCard(session) {
    return new builder.AnimationCard(session)
       // .title('')
        //.subtitle('Animation Card')
        //.image(builder.CardImage.create(session, 'https://docs.microsoft.com/en-us/bot-framework/media/how-it-works/architecture-resize.png'))
        .media([
            { url: 'https://raw.githubusercontent.com/codeislyf/SMRTOctVersion/master/images/waving.gif' }
        ]);
}
bot.dialog('Endcase',
    (session, args, next) => {
        telemetry.trackEvent({ name: "endcase" });
        session.endDialog(`Hope you found me helpful. Have a nice day ahead!`);
    }
).triggerAction({
    matches: 'Endcase'
    });

bot.dialog('When', [
    (session, args, next) => {
        var role = builder.EntityRecognizer.findEntity(args.intent.entities, 'role');
        if (role == null) {
          //  session.send('role is null');
            builder.Prompts.text(session, 'Would you like to know for -LOM or HSM?');
            //session.dialogData.role = session.message.text;
            //  session.send('session.dialogData.role ' + session.dialogData.role);

        } else {
            if (role !== null) {
                if (!session.dialogData.role) {
                    session.dialogData.role = role.entity;
                }
            }
            next();
        }
    },
    (session, args) => {
        var role;
        if (session.dialogData.role) {
            role = session.dialogData.role;
        } else {
            role = session.message.text;
           // session.send('here role is ' + role);
            //role = args.response.entity.replace(/\s\([^)]*\)/, '');
        }
        azureSearchQuery('$filter=' + encodeURIComponent(`role eq '${role}' and intent eq 'When'`), (error, result) => {
          //  session.send('role is' + role);
            if (error) {
                session.endDialog('Ooops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                if (result !== null) {
                    telemetry.trackEvent({ name: "When LOM/HSM needed" });
                    session.replaceDialog('ShowKBResults', { result, originalText: role });
                }
            }
        });
    }
]).triggerAction({
    matches: 'When'
});


bot.dialog('Why', [
    (session, args, next) => {
        var role = builder.EntityRecognizer.findEntity(args.intent.entities, 'role');
        if (role == null) {
            //  session.send('role is null');
            builder.Prompts.text(session, 'Would you like to know for -LOM or HSM?');
            //session.dialogData.role = session.message.text;
            //  session.send('session.dialogData.role ' + session.dialogData.role);

        } else {
            if (role !== null) {
                if (!session.dialogData.role) {
                    //  session.send('role is not null');
                 //   session.send(session.dialogData.role);
                    session.dialogData.role = role.entity;
                }
            }
            next();
        }
    },
    (session, args) => {
        var role;
        if (session.dialogData.role) {
            role = session.dialogData.role;
        } else {
            role = session.message.text;
           // session.send('here role is ' + role);
            //role = args.response.entity.replace(/\s\([^)]*\)/, '');
        }
        azureSearchQuery('$filter=' + encodeURIComponent(`role eq '${role}' and intent eq 'Why'`), (error, result) => {
            //  session.send('role is' + role);
            if (error) {
                session.endDialog('Ooops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                if (result !== null) {
                    telemetry.trackEvent({ name: "Why LOM/HSM needed" });
                    session.replaceDialog('ShowKBResults', { result, originalText: role });
                }
            }
        });
    }
]).triggerAction({
    matches: 'Why'
});

bot.dialog('Role', [
    (session, args, next) => {
        var role = builder.EntityRecognizer.findEntity(args.intent.entities, 'role');
        if (role == null) {
            //  session.send('role is null');
            builder.Prompts.text(session, 'Would you like to know for LOM or HSM?');
            //session.dialogData.role = session.message.text;
            //  session.send('session.dialogData.role ' + session.dialogData.role);

        } else {
            if (role !== null) {
                if (!session.dialogData.role) {
                    //  session.send('role is not null');
                    //  session.send(session.dialogData.role);
                    session.dialogData.role = role.entity;
                }
            }
            next();
        }
    },
    (session, args) => {
        var role;
        if (session.dialogData.role) {
            role = session.dialogData.role;
        } else {
            role = session.message.text;
            // session.send('here role is ' + role);
            //role = args.response.entity.replace(/\s\([^)]*\)/, '');
        }
        azureSearchQuery('$filter=' + encodeURIComponent(`role eq '${role}' and intent eq 'Role'`), (error, result) => {
            //  session.send('role is' + role);
            if (error) {
                session.endDialog('Ooops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                if (result !== null) {
                    telemetry.trackEvent({ name: "Role of LOM/HSM" });
                    session.replaceDialog('ShowKBResults', { result, originalText: role });
                }
            }
        });
    }
]).triggerAction({
    matches: 'Role'
    });

bot.dialog('Num', [
    (session, args, next) => {
        var role = builder.EntityRecognizer.findEntity(args.intent.entities, 'role');
        if (role == null) {
            //  session.send('role is null');
            builder.Prompts.text(session, 'Would you like to know for -LOM or HSM?');
            //session.dialogData.role = session.message.text;
            //  session.send('session.dialogData.role ' + session.dialogData.role);

        } else {
            if (role !== null) {
                if (!session.dialogData.role) {
                    //  session.send('role is not null');
                    //  session.send(session.dialogData.role);
                    session.dialogData.role = role.entity;
                }
            }
            next();
        }
    },
    (session, args) => {
        var role;
        if (session.dialogData.role) {
            role = session.dialogData.role;
        } else {
            role = session.message.text;
            // session.send('here role is ' + role);
            //role = args.response.entity.replace(/\s\([^)]*\)/, '');
        }
        azureSearchQuery('$filter=' + encodeURIComponent(`role eq '${role}' and intent eq 'Num'`), (error, result) => {
            //  session.send('role is' + role);
            if (error) {
                session.endDialog('Ooops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                if (result !== null) {
                    telemetry.trackEvent({ name: "Number of LOM/HSM needed" });
                    session.replaceDialog('ShowKBResults', { result, originalText: role });
                }
            }
        });
    }
]).triggerAction({
    matches: 'Num'
    });

bot.dialog('Wear', [
    (session, args, next) => {
        var role = builder.EntityRecognizer.findEntity(args.intent.entities, 'role');
        if (role == null) {
            //  session.send('role is null');
            builder.Prompts.text(session, 'Would you like to know for -LOM or HSM?');
            //session.dialogData.role = session.message.text;
            //  session.send('session.dialogData.role ' + session.dialogData.role);

        } else {
            if (role !== null) {
                if (!session.dialogData.role) {
                    //  session.send('role is not null');
                    //  session.send(session.dialogData.role);
                    session.dialogData.role = role.entity;
                }
            }
            next();
        }
    },
    (session, args) => {
        var role;
        if (session.dialogData.role) {
            role = session.dialogData.role;
        } else {
            role = session.message.text;
            // session.send('here role is ' + role);
            //role = args.response.entity.replace(/\s\([^)]*\)/, '');
        }
        azureSearchQuery('$filter=' + encodeURIComponent(`role eq '${role}' and intent eq 'Wear'`), (error, result) => {
            //  session.send('role is' + role);
            if (error) {
                session.endDialog('Ooops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                if (result !== null) {
                    telemetry.trackEvent({ name: "What LOM/HSM wear" });
                    session.replaceDialog('ShowKBResults', { result, originalText: role });
                }
            }
        });
    }
]).triggerAction({
    matches: 'Wear'
    });

bot.dialog('RiskAssessment', [
    (session, args, next) => {
        var role = builder.EntityRecognizer.findEntity(args.intent.entities, 'role');
        if (role == null) {
            //  session.send('role is null');
            builder.Prompts.text(session, 'Would you like to know for PIC or PM?');
            //session.dialogData.role = session.message.text;
            //  session.send('session.dialogData.role ' + session.dialogData.role);

        } else {
            if (role !== null) {
                if (!session.dialogData.role) {
                    //  session.send('role is not null');
                    //  session.send(session.dialogData.role);
                    session.dialogData.role = role.entity;
                }
            }
            next();
        }
    },
    (session, args) => {
        var role;
        if (session.dialogData.role) {
            role = session.dialogData.role;
        } else {
            role = session.message.text;
            // session.send('here role is ' + role);
            //role = args.response.entity.replace(/\s\([^)]*\)/, '');
        }
        azureSearchQuery('$filter=' + encodeURIComponent(`role eq '${role}' and intent eq 'RiskAssessment'`), (error, result) => {
            //  session.send('role is' + role);
            if (error) {
                session.endDialog('Ooops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                if (result !== null) {
                    telemetry.trackEvent({ name: "Risk Assessment" });
                    session.replaceDialog('ShowKBResults', { result, originalText: role });
                }
            }
        });
    }
]).triggerAction({
    matches: 'RiskAssessment'
    });

bot.dialog('Traction', [
    (session, args, next) => {
        var role = builder.EntityRecognizer.findEntity(args.intent.entities, 'role');
        if (role == null) {
            //  session.send('role is null');
            builder.Prompts.text(session, 'Would you like to know for PIC or PM?');
            //session.dialogData.role = session.message.text;
            //  session.send('session.dialogData.role ' + session.dialogData.role);

        } else {
            if (role !== null) {
                if (!session.dialogData.role) {
                    //  session.send('role is not null');
                    //  session.send(session.dialogData.role);
                    session.dialogData.role = role.entity;
                }
            }
            next();
        }
    },
    (session, args) => {
        var role;
        if (session.dialogData.role) {
            role = session.dialogData.role;
        } else {
            role = session.message.text;
        }
        azureSearchQuery('$filter=' + encodeURIComponent(`role eq '${role}' and intent eq 'Traction'`), (error, result) => {
            //  session.send('role is' + role);
            if (error) {
                session.endDialog('Ooops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                if (result !== null) {
                    telemetry.trackEvent({ name: "Power Traction arrangements" });
                    session.replaceDialog('ShowKBResults', { result, originalText: role });
                }
            }
        });
    }
]).triggerAction({
    matches: 'Traction'
    });

bot.dialog('PriorPrep', [
    (session, args, next) => {
        var role = builder.EntityRecognizer.findEntity(args.intent.entities, 'role');
        if (role == null) {
            //  session.send('role is null');
            builder.Prompts.text(session, 'Would you like to know for PIC or PM?');
            //session.dialogData.role = session.message.text;
            //  session.send('session.dialogData.role ' + session.dialogData.role);

        } else {
            if (role !== null) {
                if (!session.dialogData.role) {
                    session.dialogData.role = role.entity;
                }
            }
            next();
        }
    },
    (session, args) => {
        var role;
        if (session.dialogData.role) {
            role = session.dialogData.role;
        } else {
            role = session.message.text;
            // session.send('here role is ' + role);
            //role = args.response.entity.replace(/\s\([^)]*\)/, '');
        }
        azureSearchQuery('$filter=' + encodeURIComponent(`role eq '${role}' and intent eq 'PriorPrep'`), (error, result) => {
            //  session.send('role is' + role);
            if (error) {
                session.endDialog('Ooops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                if (result !== null) {
                    telemetry.trackEvent({ name: "Prior preparations needed" });
                    session.replaceDialog('ShowKBResults', { result, originalText: role });
                }
            }
        });
    }
]).triggerAction({
    matches: 'PriorPrep'
});

bot.dialog('RadioRules', [
    (session, args, next) => {
        var role = builder.EntityRecognizer.findEntity(args.intent.entities, 'role');
        if (role == null) {
            //  session.send('role is null');
            builder.Prompts.text(session, 'Would you like to know for PIC or PM?');
            //session.dialogData.role = session.message.text;
            //  session.send('session.dialogData.role ' + session.dialogData.role);

        } else {
            if (role !== null) {
                if (!session.dialogData.role) {
                    //  session.send('role is not null');
                    //  session.send(session.dialogData.role);
                    session.dialogData.role = role.entity;
                }
            }
            next();
        }
    },
    (session, args) => {
        var role;
        if (session.dialogData.role) {
            role = session.dialogData.role;
        } else {
            role = session.message.text;
            // session.send('here role is ' + role);
            //role = args.response.entity.replace(/\s\([^)]*\)/, '');
        }
        azureSearchQuery('$filter=' + encodeURIComponent(`role eq '${role}' and intent eq 'Radiorules'`), (error, result) => {
            //  session.send('role is' + role);
            if (error) {
                session.endDialog('Ooops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                if (result !== null) {
                    telemetry.trackEvent({ name: "Radio communication rules" });
                    session.replaceDialog('ShowKBResults', { result, originalText: role });
                }
            }
        });
    }
]).triggerAction({
    matches: 'Radiorules'
    });

bot.dialog('Siteensure', [
    (session, args, next) => {
        var role = builder.EntityRecognizer.findEntity(args.intent.entities, 'role');
        if (role == null) {
            //  session.send('role is null');
            builder.Prompts.text(session, 'Would you like to know for PIC or PM?');
            //session.dialogData.role = session.message.text;
            //  session.send('session.dialogData.role ' + session.dialogData.role);

        } else {
            if (role !== null) {
                if (!session.dialogData.role) {
                    //  session.send('role is not null');
                    //  session.send(session.dialogData.role);
                    session.dialogData.role = role.entity;
                }
            }
            next();
        }
    },
    (session, args) => {
        var role;
        if (session.dialogData.role) {
            role = session.dialogData.role;
        } else {
            role = session.message.text;
            // session.send('here role is ' + role);
            //role = args.response.entity.replace(/\s\([^)]*\)/, '');
        }
        azureSearchQuery('$filter=' + encodeURIComponent(`role eq '${role}' and intent eq 'Siteensure'`), (error, result) => {
            //  session.send('role is' + role);
            if (error) {
                session.endDialog('Ooops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                if (result !== null) {
                    telemetry.trackEvent({ name: "What to ensure before leaving site" });
                    session.replaceDialog('ShowKBResults', { result, originalText: role });
                }
            }
        });
    }
]).triggerAction({
    matches: 'Siteensure'
    });

bot.dialog('BefrLeave', [
    (session, args, next) => {
        var role = builder.EntityRecognizer.findEntity(args.intent.entities, 'role');
        if (role == null) {
            //  session.send('role is null');
            builder.Prompts.text(session, 'Would you like to know for PIC/PM/HSM/LOM?');
            //session.dialogData.role = session.message.text;
            //  session.send('session.dialogData.role ' + session.dialogData.role);

        } else {
            if (role !== null) {
                if (!session.dialogData.role) {
                    //  session.send('role is not null');
                    //  session.send(session.dialogData.role);
                    session.dialogData.role = role.entity;
                }
            }
            next();
        }
    },
    (session, args) => {
        var role;
        if (session.dialogData.role) {
            role = session.dialogData.role;
        } else {
            role = session.message.text;
            // session.send('here role is ' + role);
            //role = args.response.entity.replace(/\s\([^)]*\)/, '');
        }
        azureSearchQuery('$filter=' + encodeURIComponent(`role eq '${role}' and intent eq 'BefrLeave'`), (error, result) => {
            //  session.send('role is' + role);
            if (error) {
                session.endDialog('Ooops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                if (result !== null) {
                    telemetry.trackEvent({ name: "What to ensure before leaving site" });
                    session.replaceDialog('ShowKBResults', { result, originalText: role });
                }
            }
        });
    }
]).triggerAction({
    matches: 'BefrLeave'
    });

bot.dialog('Cover', [
    (session, args, next) => {
        var role = builder.EntityRecognizer.findEntity(args.intent.entities, 'role');
        if (role == null) {
            //  session.send('role is null');
            builder.Prompts.text(session, 'Would you like to know for LOM or HSM?');
            //session.dialogData.role = session.message.text;
            //  session.send('session.dialogData.role ' + session.dialogData.role);

        } else {
            if (role !== null) {
                if (!session.dialogData.role) {
                    //  session.send('role is not null');
                    //  session.send(session.dialogData.role);
                    session.dialogData.role = role.entity;
                }
            }
            next();
        }
    },
    (session, args) => {
        var role;
        if (session.dialogData.role) {
            role = session.dialogData.role;
        } else {
            role = session.message.text;
            // session.send('here role is ' + role);
            //role = args.response.entity.replace(/\s\([^)]*\)/, '');
        }
        azureSearchQuery('$filter=' + encodeURIComponent(`role eq '${role}' and intent eq 'Cover'`), (error, result) => {
            //  session.send('role is' + role);
            if (error) {
                session.endDialog('Ooops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                if (result !== null) {
                    telemetry.trackEvent({ name: "Can cover" });
                    session.replaceDialog('ShowKBResults', { result, originalText: role });
                }
            }
        });
    }
]).triggerAction({
    matches: 'Cover'
});
bot.dialog('Relief', [
    (session, args, next) => {
        var role = builder.EntityRecognizer.findEntity(args.intent.entities, 'role');
        if (role == null) {
            //  session.send('role is null');
            builder.Prompts.text(session, 'Would you like to know for PIC or PM?');
            //session.dialogData.role = session.message.text;
            //  session.send('session.dialogData.role ' + session.dialogData.role);

        } else {
            if (role !== null) {
                if (!session.dialogData.role) {
                    //  session.send('role is not null');
                    //  session.send(session.dialogData.role);
                    session.dialogData.role = role.entity;
                }
            }
            next();
        }
    },
    (session, args) => {
        var role;
        if (session.dialogData.role) {
            role = session.dialogData.role;
        } else {
            role = session.message.text;
            // session.send('here role is ' + role);
            //role = args.response.entity.replace(/\s\([^)]*\)/, '');
        }
        azureSearchQuery('$filter=' + encodeURIComponent(`role eq '${role}' and intent eq 'Relief'`), (error, result) => {
            //  session.send('role is' + role);
            if (error) {
                session.endDialog('Ooops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                if (result !== null) {
                    telemetry.trackEvent({ name: "Relief" });
                    session.replaceDialog('ShowKBResults', { result, originalText: role });
                }
            }
        });
    }
]).triggerAction({
    matches: 'Relief'
});

bot.dialog('StnBooking', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=StnBooking`, (err, result) => {
          
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Which station to book?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'StnBooking'
    });
bot.dialog('PICRoleatStn', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=PICRoleatStn`, (err, result) => {
            //  session.send(luisRecognizer.text);
            //  azureSearchQuery('$filter=' + encodeURIComponent(`category eq '${category}'`), (error, result) => {   
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "What should PIC do at PIC station?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'PICRoleatStn'
    });

bot.dialog('SightDistn', [
    (session) => {
        session.sendTyping();

        azureSearchQuery(`search=SightDistn`, (err, result) => {
            //  session.send(luisRecognizer.text);
            //  azureSearchQuery('$filter=' + encodeURIComponent(`category eq '${category}'`), (error, result) => {   
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "What's min sighting distance?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'SightDistn'
    });
bot.dialog('SightTime', [
    (session) => {
        session.sendTyping();

        azureSearchQuery(`search=SightTime`, (err, result) => {
            //  session.send(luisRecognizer.text);
            //  azureSearchQuery('$filter=' + encodeURIComponent(`category eq '${category}'`), (error, result) => {   
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "What's minimum sighting time?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'SightTime'
    });

bot.dialog('WhereHSM', [
    (session) => {
        session.sendTyping();

        azureSearchQuery(`search=WhereHSM`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Where to place HSM?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'WhereHSM'
    });

bot.dialog('WhereLOM', [
    (session) => {
        session.sendTyping();

        azureSearchQuery(`search=WhereLOM`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Where to place LOM?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'WhereLOM'
    });
bot.dialog('ConductSurvey', [
    (session) => {
        session.sendTyping();

        azureSearchQuery(`search=ConductSurvey`, (err, result) => {
            //  session.send(luisRecognizer.text);
            //  azureSearchQuery('$filter=' + encodeURIComponent(`category eq '${category}'`), (error, result) => {   
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "How to conduct site survey?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'ConductSurvey'
    });

bot.dialog('GenRiskAssessment', [
    (session) => {
        session.sendTyping();

        azureSearchQuery(`search=GenRiskAssessment`, (err, result) => {
            //  session.send(luisRecognizer.text);
            //  azureSearchQuery('$filter=' + encodeURIComponent(`category eq '${category}'`), (error, result) => {   
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "How to do risk assessment of work activities?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'GenRiskAssessment'
    });



bot.dialog('PMWhyPossess', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=PMWhyPossess`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Why PM need to take possession of tracks?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'PMWhyPossess'
    });

bot.dialog('NeedofPIC', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=NeedofPIC`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "When do I need PIC?"});
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'NeedofPIC'
    });
bot.dialog('PMHowpossess', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=PMHowpossess`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "How PM need to take possession of tracks?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'PMHowpossess'
    });
bot.dialog('CanPMPIC', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=CanPMPIC`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Can a PM also a PIC?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'CanPMPIC'
    });

bot.dialog('PICSafety', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=PICSafety`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "What must you ensure as a PIC wrt safety of your staff working on the tracks?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'PICSafety'
    });

bot.dialog('PICNoPossess', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=PICNoPossess`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Why PIC cannot take possession of tracks?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'PICNoPossess'
    });

bot.dialog('WhenDanger', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=WhenDanger`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "When do I need to display a 'Danger' handsignal?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'WhenDanger'
    });


bot.dialog('WhoDanger', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=WhoDanger`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Who can display the 'Danger' handsignal?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'WhoDanger'
    });

bot.dialog('Warning', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=Warning`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Who gives warning to working party when train is approaching?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'Warning'
    });
bot.dialog('CtrlMove', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=CtrlMove`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Who controls train movements?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'CtrlMove'
    });

bot.dialog('RoleReversalLH', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=RoleReversalLH`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Can a LOM also a HSM?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'RoleReversalLH'
    });
bot.dialog('RoleReversalHL', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=RoleReversalHL`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Can a HSM also be a LOM?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'RoleReversalHL'
    });
bot.dialog('tracktrolleyprot', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=tracktrolleyprot`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Who is responsible for the protection of track trolley?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'tracktrolleyprot'
    });
bot.dialog('Notontime', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=Notontime`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "What to do if work cannot be finished on time?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'Notontime'
    });
bot.dialog('Surrender', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=Surrender`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Should PM surrender the possession when time is up?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'Surrender'
    });
bot.dialog('LOMSiteensure', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=LOMSiteensure`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "What must you ensure before you leave the worksite when the work is done for LOM?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'LOMSiteensure'
    });
bot.dialog('HSMSiteensure', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=HSMSiteensure`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "What must you ensure before you leave the worksite when the work is done for HSM?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'HSMSiteensure'
    });
bot.dialog('StoreItems', [
    (session) => {
        session.sendTyping();
        azureSearchQuery(`search=StoreItems`, (err, result) => {
            if (err) {
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
                return;
            }
            telemetry.trackEvent({ name: "Can I store items at trackside?" });
            session.replaceDialog('ShowKBResults', { result, originalText: session.message.text });
        });
    }
])
    .triggerAction({
        matches: 'StoreItems'
    });
bot.dialog('ShowKBResults', [
    (session, args) => {
        var count = 0;
        var img = new builder.Message(session).attachmentLayout(builder.AttachmentLayout.carousel);
        if (args.result.value.length > 0) {
            args.result.value.forEach((faq, i) => {
                session.send(faq.answer);
                
                if (faq.image !== "null") {
                    img.addAttachment(new builder.HeroCard(session)
                        .images([builder.CardImage.create(session, faq.image)]));
                    count = 1;
                }
                else count = 0;
            });
            if (count == 1) {
                session.send(img);
            }
            session.endDialog('Do you have other questions? Feel free to ask me!');
        } else {
            session.endDialog(`Sorry, I could not find any results.`);
        }
    }]);
function createVideoCard(session) {
    return new builder.VideoCard(session)
        .title('30 Years working for you')
        .subtitle('SMRT')
        .text('As SMRT celebrates its milestone 30th anniversary this year, our family of 10,000 people remains committed to serving all our commuters.')
        .image(builder.CardImage.create(session, 'https://smrt.com.sg/Portals/0/logo-smrt.png?ver=2017-09-13-151240-193'))
        .media([
            {
                //url: 'https://www.youtube.com/watch?v=vqX3jlVBQqE&feature=youtu.be'
                url:'http://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4'
            } 
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://smrt.com.sg/Doing-Business-with-Us/SMRT-Institute','Learn more')
          
        ]);
}
bot.dialog('WhenVideo', [
    (session) => {
        session.sendTyping();

        azureSearchQuery(`search=WhenVideo`, (err, result) => {
            if (err) {
                session.send(err.message);
                session.send('Oops! Something went wrong while contacting Azure Search. Please try again later.');
            } else {
                var card = createVideoCard(session);
                var msg = new builder.Message(session).addAttachment(card);
                session.endDialog(msg);
                //  return card;
            }
        }
        );
    }
]).triggerAction({
    matches: 'WhenVideo'
});
