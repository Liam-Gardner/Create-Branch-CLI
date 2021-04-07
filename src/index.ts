import { Command, flags } from "@oclif/command";
import { exec } from "child_process";
import prompt from "prompt";
import axios from "axios";
import * as fs from "fs";
import path from "path";
import { schema } from "./prompt.config";
import { Args, UserConfig } from "./types";

class TicketToBranch extends Command {
  homedir = require("os").homedir();

  private userConfig = {
    authKey: "",
    companyName: "",
    prefix: "",
    autoCreateBranch: true,
  };

  getUserConfig(): UserConfig {
    return this.userConfig;
  }

  setUserConfig(config: UserConfig) {
    // set config in state
    this.userConfig = { ...this.userConfig, ...config };
    // write config to file
    fs.writeFileSync(this.usrStoragePath, JSON.stringify(this.userConfig));
  }

  //#region Fields
  // remove authkey, get from userConfig instaed
  private authKey: string = "";
  private usrStoragePath = path.join(this.homedir, ".ticket-to-branch");

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
  // TODO: do not overwrite everything in the config
  private resetConfig() {
    console.log("removing bad key");
    const currentConfig = this.getUserConfig();
    fs.writeFileSync(
      this.usrStoragePath,
      JSON.stringify({ ...currentConfig, authKey: "" })
    );
  }

  async captureUserInput() {
    // TODO: might need to check more than this cos we have more props now
    const { authKey } = this.getUserConfig();
    if (authKey) {
      return;
    } else {
      prompt.start();
      // This should be conditional - if I entered these before but I have no authkey do not make me fill these in again!
      const { username, companyName, prefix, apiKey } = await prompt.get(
        schema
      );
      const authKey = Buffer.from(`${username}:${apiKey}`).toString("base64");

      // TODO: why do I need to convert these to strings?
      this.setUserConfig({
        authKey,
        companyName: companyName as string,
        prefix: prefix as string,
      });
    }
  }

  async callJiraAPI(ticketNumber: string) {
    const { companyName } = this.getUserConfig();
    try {
      const authKey = this.getAuthKey();
      const response = await axios.get(
        `https://${companyName}.atlassian.net/rest/api/2/issue/${ticketNumber}`,
        {
          headers: {
            Authorization: `Basic ${authKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data.fields.summary as string;
    } catch (err) {
      // TODO: add some colour!
      console.error("Jira API request error", err.message);
      this.resetConfig();
    }
  }

  static args: Args = [
    {
      name: "ticketNumber",
      required: true,
      parse: (input: string) => TicketToBranch.parseInput(input),
    },
  ];

  // why do this? why not wait for the userinput and then create this
  createConfig() {
    if (fs.existsSync(this.usrStoragePath)) {
      fs.writeFileSync(this.usrStoragePath, JSON.stringify(this.userConfig));
    }
  }
  // probably need a loadConfig on startup
  loadConfig() {
    if (fs.existsSync(this.usrStoragePath)) {
      const data = fs.readFileSync(this.usrStoragePath, {
        encoding: "utf8",
        flag: "r",
      });
      try {
        const parsedData: UserConfig = JSON.parse(data);
        this.setUserConfig(parsedData);
      } catch (e) {
        console.log("error getting user config");
        // TODO: process exit
      }
    }
  }

  async run() {
    this.loadConfig(); // TODO: What happens if error?
    console.log(this.getUserConfig());
    await this.captureUserInput();

    // WARN: If i grab the args before captureUserInput it fills in the user input!
    const { args } = this.parse(TicketToBranch);

    // TODO: why doesnt args. autocomplete?
    const ticketName = await this.callJiraAPI(args.ticketNumber);

    const sanitisedTicketName = this.sanitiseTicketName(ticketName);

    const { autoCreateBranch, prefix } = this.getUserConfig();

    // TODO: do not execute until user is shown the branch name and likes it!
    // TODO: get initals and pass them here instead of hardcoded value
    autoCreateBranch &&
      sanitisedTicketName &&
      exec(
        `git checkout -b ${prefix}/${args.ticketNumber}-${sanitisedTicketName}`
      );
  }
}
export = TicketToBranch;
