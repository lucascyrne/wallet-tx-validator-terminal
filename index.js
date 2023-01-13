const readline = require("readline");
const fetch = require("node-fetch");
const fs = require("fs");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/* 
*  Fetch all unvalidated transactions.
?  @return [{ tx }] an array with N transaction objects (N >= 1).
*/
function getAllUnvalidatedTx() {
  console.log("👷 Getting all unvalidated transactions...");

  fs.readFile("./tx_history.md", "utf8", (error, fileData) => {
    if (error) {
      //todo? maybe ask the user to fetch data and create a new file.
      return console.error(error);
    }

    let txJson = JSON.parse(fileData);
    let txData = txJson.filter((tx) => {
      return tx.isValidated == "1";
    });

    console.log(txData);
    console.log("\n");
  });
  setTimeout(mainMenu, 3000);
}

/* 
* Fetch all unvalidated transactions that fullfils specific parameters.
? @return [{ tx }] an array with N transactions objects (N >= 1).
*/
function getUnvalidatedTx() {
  rl.question("\n👷 Please insert the search parameters:\n\nFrom: ", (from) => {
    rl.question("To: ", (to) => {
      rl.question("Value: ", (value) => {
        const searchTxObject = {
          from: from,
          to: to,
          value: value,
          isValidated: 1,
        };
        fs.readFile("./tx_history.md", "utf8", (err, fileData) => {
          if (err) {
            return console.error(err);
          }

          const txJson = JSON.parse(fileData);
          const foundTx = txJson.filter((item) => {
            return (
              item.from == searchTxObject.from &&
              item.to == searchTxObject.to &&
              item.value == searchTxObject.value &&
              item.isValidated == searchTxObject.isValidated
            );
          });
          console.log(foundTx);
        });
        setTimeout(mainMenu, 3000);
      });
    });
  });
}

/* 
*  Validate or invalidate many transactions.
?  @return updates N { tx } in transaction history (N >= 2).
*/
function consumeManyTx(mode) {
  rl.question(
    "\n👷 Please insert the validation parameters:\n\nstarting block: ",
    (startBlock) => {
      rl.question("ending block: ", (endBlock) => {
        fs.readFile("./tx_history.md", "utf8", (err, fileData) => {
          if (err) {
            return console.error(err);
          }

          let txJson = JSON.parse(fileData);

          let updatedTxJson = txJson.map((tx) => {
            if (tx.blockNumber >= startBlock && tx.blockNumber <= endBlock) {
              if (mode === 0) {
                return { ...tx, isValidated: "0" };
              } else if (mode === 1) {
                return { ...tx, isValidated: "1" };
              } else {
                console.error(
                  "👷 Something went wrong. Consume mode not defined."
                );
                return tx;
              }
            }
            return tx;
          });

          fs.writeFile(
            "./tx_history.md",
            JSON.stringify(updatedTxJson, null, 2),
            "utf8",
            (err) => {
              if (err) {
                return console.error(err);
              }
              console.log("👷 transaction history updated.");
            }
          );

          setTimeout(streamTxs, 3000);
        });

        setTimeout(mainMenu, 3000);
      });
    }
  );
}

/* 
*  Validate or invalidate a single transaction.
?  @return updates a single { tx } in transaction history.
*/
function consumeTx(mode) {
  rl.question("\n👷 Please insert the transaction hash: ", (tx_hash) => {
    fs.readFile("./tx_history.md", "utf8", (err, fileData) => {
      if (err) {
        return console.error(err);
      }

      let txJson = JSON.parse(fileData);

      let updatedTxJson = txJson.map((tx) => {
        if (tx.tx_hash == tx_hash) {
          if (mode === 0) {
            return { ...tx, isValidated: "0" };
          } else if (mode === 1) {
            return { ...tx, isValidated: "1" };
          } else {
            console.error("👷 Something went wrong. Consume mode not defined.");
            return tx;
          }
        }
        return tx;
      });

      fs.writeFile(
        "./tx_history.md",
        JSON.stringify(updatedTxJson, null, 2),
        "utf8",
        (err) => {
          if (err) {
            return console.error(err);
          }
          console.log("👷 transaction history updated.");
        }
      );

      setTimeout(streamTxs, 3000);
    });

    setTimeout(mainMenu, 3000);
  });
}

/* 
* Mirror the original transaction file to the backup transaction file.
? @return update transaction backup file.
*/
const streamTxs = () => {
  fs.copyFile("./tx_history.md", "./tx_history_backup.md", (err) => {
    if (err) {
      console.log(err);
    }
  });
};

/* 
* Fetch all transactions registered in Alfajores blockchain.
? @return updates transaction main & backup file with new data.
*/
const fetchTxs = () => {
  // account 1: 0x8dB402e86Bc94bD1F15Ab00E7D89b94ADd493c64
  // account 2: 0xE7AE37EEe6b95852768dB502FB3BB160De1D952a

  if (!fs.existsSync("./tx_history.md")) {
    console.log(
      "\n👷 Warning: transaction history not found. Please restart the service."
    );
  }

  if (!fs.existsSync("./tx_history_backup.md")) {
    console.log("\n👷 Warning: No backup file found.");
  }

  const intervalId = setInterval(async () => {
    const data = await fetch(
      "https://api-alfajores.celoscan.io/api?module=account&action=txlist&address=0xE7AE37EEe6b95852768dB502FB3BB160De1D952a&sort=asc&apikey=YourApiKeyToken"
    )
      .then((res) => res.json())
      .then((json) => {
        const data = [];

        for (var i = 0; i < json.result.length; i++) {
          const tx = {
            blockNumber: "",
            tx_hash: "",
            from: "",
            to: "",
            isValidated: "1",
            isError: "",
            value: "0",
          };

          tx.blockNumber = json.result[i].blockNumber;
          tx.tx_hash = json.result[i].hash;
          tx.from = json.result[i].from;
          tx.to = json.result[i].to;
          tx.isError = json.result[i].isError;
          tx.value = (json.result[i].value / 1000000000000000000).toString();

          data.push(tx);
        }

        return data;
      });

    fs.readFile("./tx_history.md", "utf8", (err, fileData) => {
      if (err) {
        return console.error(err);
      }

      if (fileData == "[]") {
        console.log("\n👷 Here we go!");
        fs.writeFile(
          "./tx_history.md",
          JSON.stringify(data, null, 2),
          "utf8",
          (err) => {
            if (err) {
              return console.error(err);
            }

            console.log("👷 Transaction history updated.");
            console.log("Press b to back to main menu\n");
          }
        );
      } else {
        let txJson = JSON.parse(fileData);

        let updatedTxJson = txJson.map((tx) => {
          if (tx.isValidated == "1") {
            return tx;
          }
          return tx;
        });

        fs.writeFile(
          "./tx_history.md",
          JSON.stringify(updatedTxJson, null, 2),
          "utf8",
          (err) => {
            if (err) {
              return console.error(err);
            }

            console.log("\n👷 Transaction history updated.");
            console.log("Press b to back to main menu\n");
          }
        );
      }

      setTimeout(streamTxs, 3000);
    });
  }, 10000);

  rl.question("", (input) => {
    if (input == "b") {
      clearInterval(intervalId);
      mainMenu();
    }
  });
};

/*
 * Initializes the service with a terminal options menu.
 * Initializes both transaction files.
 */
const mainMenu = () => {
  if (!fs.existsSync("./tx_history.md")) {
    fs.writeFile("./tx_history.md", JSON.stringify([]), (err) => {
      if (err) {
        return console.error(err);
      }
    });
  }

  if (!fs.existsSync("./tx_history_backup.md")) {
    fs.writeFile("./tx_history_backup.md", JSON.stringify([]), (err) => {
      if (err) {
        return console.error(err);
      }
    });
  }

  rl.question(
    "👷 Please choose a service:\n\n(1) Fetch new transactions\n(2) Fetch unvalidated transactions\n(3) Fetch all unvalidated transactions\n(4) Validate a transaction\n(5) Validate many transactions\n(6) Invalidate a transaction\n(7) Invalidate many transactions\n(8) Update the backup file\n\ninput: ",
    (input) => {
      if (input == "1") {
        fetchTxs();
      } else if (input == "2") {
        getUnvalidatedTx();
      } else if (input == "3") {
        getAllUnvalidatedTx();
      } else if (input == "4") {
        consumeTx(0);
      } else if (input == "5") {
        consumeManyTx(0);
      } else if (input == "6") {
        consumeTx(1);
      } else if (input == "7") {
        consumeManyTx(1);
      } else if (input == "8") {
        streamTxs();
        setTimeout(mainMenu, 3000);
      } else {
        console.log("👷 Invalid option, please try again");
        mainMenu();
      }
    }
  );
};

mainMenu();
