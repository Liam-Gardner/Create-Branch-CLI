import { Command, flags } from "@oclif/command";
import { exec } from "child_process";
import prompt from "prompt";
import axios from "axios";
import * as fs from "fs";
import path from "path";
import { schema } from "./prompt.config";

class TicketToBranch extends Command {
  homedir = require("os").homedir();

  //#region Fields
  private authKey: string = "";
  private usrStoragePath = path.join(this.homedir, ".ticket-to-branch"); // TODO: change this path?

  static description = "describe the command here";
  static flags = {
    // add --version flag to show CLI version
    version: flags.version({ char: "v" }),
    help: flags.help({ char: "h" }),
    // flag with a value (-n, --name=VALUE)
    name: flags.string({ char: "n", description: "name to print" }),
    // flag with no value (-f, --force)
    force: flags.boolean({ char: "f" }),
  };
  //#endregion

  //#region Methods
  getAuthKey() {
    return this.authKey;
  }

  setAuthKey(authKey?: string) {
    if (!authKey) {
      console.log("Checking for stored key...");
      const data = fs.readFileSync(this.usrStoragePath, {
        encoding: "utf8",
        flag: "r",
      });
      if (data) {
        try {
          const config = JSON.parse(data);
          if (config && config.authKey !== "") {
            // set the authkey to the one stored in file
            this.authKey = config.authKey;
            console.log("Stored key found!");
          } else {
            console.log("No stored key found!");
          }
        } catch (e) {
          console.log("error parsing the config file", e.message);
        }
      }
    } else {
      console.log("Saving new key for next time!");
      fs.writeFileSync(this.usrStoragePath, JSON.stringify({ authKey }));
      this.authKey = authKey;
    }
  }

  static parseInput(ticketNumber: string) {
    // INFO: incase we get btk-1234 split at the - and uppercase
    const ticketNumberSplit = ticketNumber.split("-");

    if (ticketNumberSplit.length < 2) {
      return ticketNumber;
    }

    return `${ticketNumberSplit[0].toUpperCase()}-${ticketNumberSplit[1]}`;
  }

  sanitiseTicketName(ticketName?: string) {
    // TODO: replace this with regex
    return (
      ticketName &&
      ticketName
        .trim()
        .replace(/&/g, "and")
        .replace(/-/g, " ")
        .replace(/  /g, " ")
        .replace(/ /g, "-")
        .replace(/\(/g, "")
        .replace(/\)/g, "")
        .replace(/'/g, "")
        .replace(/\//g, "-")
        .replace(/\\/g, "-")
        .replace(/\[/g, "")
        .replace(/\]/g, "")
        .replace(/,/g, "")
    );
  }

  // TODO: use a flag to trigger this
  private resetConfig() {
    console.log("removing bad key");
    fs.writeFileSync(this.usrStoragePath, JSON.stringify({ authKey: "" }));
  }

  async captureUserInput() {
    if (this.authKey) {
      return;
    } else {
      prompt.start();
      const { username, apiKey } = await prompt.get(schema);
      const authKey = Buffer.from(`${username}:${apiKey}`).toString("base64");
      this.setAuthKey(authKey);
    }
  }

  async callJiraAPI(ticketNumber: string) {
    try {
      const authKey = this.getAuthKey();
      const response = await axios.get(
        `https://flipdish.atlassian.net/rest/api/2/issue/${ticketNumber}`,
        {
          headers: {
            Authorization: `Basic ${authKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      // TODO: return the assigned to field also so we can work out the initials
      return response.data.fields.summary as string;
    } catch (err) {
      // TODO: add some colour!
      console.error("Jira API request error", err.message);
      this.resetConfig();
    }
  }

  static args: [
    {
      name: "ticketNumber";
      required: boolean;
      parse: (input: string) => string;
    }
  ] = [
    {
      name: "ticketNumber",
      required: true,
      parse: (input: string) => TicketToBranch.parseInput(input),
    },
  ];

  createConfig() {
    if (!fs.existsSync(this.usrStoragePath)) {
      fs.writeFileSync(this.usrStoragePath, JSON.stringify({ authKey: "" }));
    }
  }

  async run() {
    this.createConfig();
    this.setAuthKey();
    await this.captureUserInput();
    const { args } = this.parse(TicketToBranch);

    // TODO: why doesnt args. autocomplete?
    const ticketName = await this.callJiraAPI(args.ticketNumber);

    const sanitisedTicketName = this.sanitiseTicketName(ticketName);

    // TODO: do not execute until user is shown the branch name and likes it!
    // TODO: get initals and pass them here instead of hardcoded value
    sanitisedTicketName &&
      exec(`git checkout -b lg/${args.ticketNumber}-${sanitisedTicketName}`);
  }
}
export = TicketToBranch;
