# ticket-to-branch

Takes your Jira ticket number and creates a local git branch!

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/ticket-to-branch.svg)](https://npmjs.org/package/ticket-to-branch)
[![Downloads/week](https://img.shields.io/npm/dw/ticket-to-branch.svg)](https://npmjs.org/package/ticket-to-branch)
[![License](https://img.shields.io/npm/l/ticket-to-branch.svg)](https://github.com/Liam-Gardner/ticket-to-branch/blob/master/package.json)
<br /><br />

# Description

Use this simple CLI to create a valid local git branch from your Jira ticket number. You can also

- assign the ticket to yourself
- update the ticket status, e.g 'Code Review', 'Done', etc.
- add a worklog to the ticket

# Usage

```
INSTALL
$ npm install -g ticket-to-branch
OR
$ yarn global add ticket-to-branch
```

```
USAGE
$ createBranch [JIRA-TICKET-NUMBER]


OPTIONS
  -a, --assignUserToTicket       Assign current user to ticket
  -c, --userConfig               Show config
  -r, --reset                    Reset the config
  -s, --updateTicketStatus=Done  Update ticket with status or 'all' to view available statuses
  -t, --updateTicketTime=4h      Update time spent on ticket in (m)inutes, (h)ours, or (d)ays
  -v, --version                  show CLI version
```

# Example

The first time you run the command you need to provide some basic info:

- Your login email address
- Jira server name - usually your company name, check your URL
- An optional prefix to use on your branch name, e.g. your initials
- Your Jira personal access token
  - In Jira click your profile pic
  - Account settings
    - Security
    - Create and manage API tokens

```
$ createBranch BTK-1234

> Enter your Jira login email address: me@mycompany.com
> Enter the company name used in your Jira URL: mycompany
> (Optional) Enter a prefix for your branch names:
> Enter your personal Jira API key: **************

OUTPUT
$ My-Project git:(BTK-1234-my-awesome-new-feature)
```
