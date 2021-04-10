import { Command, flags } from "@oclif/command";
import { exec } from "child_process";
import prompt from "prompt";
import axios from "axios";
import * as fs from "fs";
import path from "path";
import { schema } from "./prompt.config";
import { Args, Flags, UserConfig } from "./types";

class TicketToBranch extends Command {
  // #region fields
  private homedir = require("os").homedir();

  private userConfig = {
    authKey: "",
    companyName: "",
    prefix: "",
    autoCreateBranch: true,
  };

  private usrStoragePath = path.join(this.homedir, ".ticket-to-branch");

  static description = "Create a git branch from your Jira ticket number";

  static flags = {
    version: flags.version({ char: "v" }),
    help: flags.boolean({ char: "h" }),
    reset: flags.boolean({ char: "r", description: "Reset the config" }),
  };

  static args: Args = [
    {
      name: "ticketNumber",
      required: true,
      parse: (input: string) => TicketToBranch.parseInput(input),
    },
  ];
  //#endregion

  // #region properties
  getUserConfig(): UserConfig {
    return this.userConfig;
  }

  setUserConfig(config: UserConfig) {
    // set config in state
    this.userConfig = { ...this.userConfig, ...config };
    // write config to file
    fs.writeFileSync(this.usrStoragePath, JSON.stringify(this.userConfig));
  }
  //#endregion

  // #region Methods
  handleFlags(flags: Flags) {
    const { help, reset, version } = flags;
    if (reset) {
      this.log("Resetting config...");
      this.resetConfig();
      this.log("reset complete");
    }
    if (help) {
      this.log("eh good luck with that :)");
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
    const { authKey, companyName } = this.getUserConfig();
    console.log("callJiraAPI", authKey);
    try {
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
        console.log();
        this.error("error getting user config", { exit: 2 });
        // TODO: process exit
      }
    }
  }
  //#endregion

  // #region main
  async run() {
    this.loadConfig(); // TODO: What happens if error?
    // WARN: If i grab the args before captureUserInput it fills in the user input!
    const { args, flags } = this.parse(TicketToBranch);

    this.handleFlags(flags);
    // console.log(this.getUserConfig());
    await this.captureUserInput();

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
  //#endregion
}
export = TicketToBranch;
