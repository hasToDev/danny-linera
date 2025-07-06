#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};

use danny_game::{ApplicationParameters, DannyGameMessage, LeaderboardEntry, Operation};

use self::state::DannyGameState;

pub struct DannyGameContract {
    state: DannyGameState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(DannyGameContract);

impl WithContractAbi for DannyGameContract {
    type Abi = danny_game::DannyGameAbi;
}

impl Contract for DannyGameContract {
    type Message = DannyGameMessage;
    type Parameters = ApplicationParameters;
    type InstantiationArgument = String;
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = DannyGameState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        DannyGameContract { state, runtime }
    }

    async fn instantiate(&mut self, player_name: Self::InstantiationArgument) {
        // Ініціалізація
        self.state.value.set(0);
        self.state.best.set(0);
        self.state.player_name.set(player_name);
        self.state.top_leaderboard.set(Vec::new());
        self.state.leaderboard_chain_id.set(None);
        self.state.is_leaderboard_chain.set(false);
    }

    async fn execute_operation(&mut self, operation: Operation) -> Self::Response {
        match operation {
            Operation::Increment { value } => {
                let current = *self.state.value.get();
                self.state.value.set(current + value);
            }

            Operation::SetBest { best } => {
                self.state.best.set(best);

                // Якщо це не центральний лідерборд, надіслати результат
                if !*self.state.is_leaderboard_chain.get() {
                    if let Some(leaderboard_chain_id) = self.state.leaderboard_chain_id.get() {
                        let player_name = self.state.player_name.get().clone();
                        let message = DannyGameMessage::SubmitScore {
                            player_name,
                            score: best,
                            player_chain_id: self.runtime.chain_id(),
                        };

                        self.runtime
                            .prepare_message(message)
                            .send_to(*leaderboard_chain_id);
                    }
                }

                self.state.value.set(0);
            }

            Operation::SetPlayerName { name } => {
                if !name.is_empty() {
                    self.state.player_name.set(name);
                }
            }

            Operation::SetLeaderboardChain { chain_id } => {
                self.state.leaderboard_chain_id.set(Some(chain_id));
                
                // Якщо це наш ланцюжок, позначити як центральний лідерборд
                if self.runtime.chain_id() == chain_id {
                    self.state.is_leaderboard_chain.set(true);
                }
            }

            Operation::RequestLeaderboard => {
                // Запросити лідерборд тільки якщо це не центральний лідерборд
                if !*self.state.is_leaderboard_chain.get() {
                    if let Some(leaderboard_chain_id) = self.state.leaderboard_chain_id.get() {
                        let message = DannyGameMessage::RequestLeaderboard {
                            requester_chain_id: self.runtime.chain_id(),
                        };

                        self.runtime
                            .prepare_message(message)
                            .send_to(*leaderboard_chain_id);
                    }
                }
            }

            Operation::SetupGame {leaderboard_chain_id, player_name} => {
                // TODO: Реалізуйте цю операцію
                panic!("Відсутня реалізація Operation::SetupGame");
            }

            Operation::SetBestAndSubmit {best} => {
                // TODO: Реалізуйте цю операцію
                panic!("Відсутня реалізація Operation::SetBestAndSubmit");
            }
        }
    }

    async fn execute_message(&mut self, message: DannyGameMessage) {
        // Перевірити чи повідомлення відбивається
        let is_bouncing = self
            .runtime
            .message_is_bouncing()
            .unwrap_or(false);

        if is_bouncing {
            return;
        }

        match message {
            DannyGameMessage::SubmitScore {
                player_name,
                score,
                player_chain_id,
            } => {
                // Обробляти тільки на центральному лідерборді
                if *self.state.is_leaderboard_chain.get() {
                    self.update_leaderboard(player_name, score, player_chain_id).await;
                }
            }

            DannyGameMessage::RequestLeaderboard { requester_chain_id } => {
                // Відповісти тільки якщо це центральний лідерборд
                if *self.state.is_leaderboard_chain.get() {
                let leaderboard = self.state.top_leaderboard.get().clone();
                    let response = DannyGameMessage::LeaderboardResponse { leaderboard };

                self.runtime
                    .prepare_message(response)
                    .send_to(requester_chain_id);
            }
            }

            DannyGameMessage::LeaderboardResponse { leaderboard } => {
                // Оновити локальний кеш лідерборду
                self.state.top_leaderboard.set(leaderboard);
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl DannyGameContract {
    async fn update_leaderboard(&mut self, player_name: String, score: u64, player_chain_id: linera_sdk::linera_base_types::ChainId) {
        let timestamp = self.runtime.system_time().micros();
        
        // Перевірити чи потрібно оновити результат гравця
        let should_update = match self.state.leaderboard.get(&player_name).await {
            Ok(Some(existing)) => score > existing.score,
            _ => true,
        };

        if should_update {
            let entry = LeaderboardEntry {
                player_name: player_name.clone(),
                score,
                timestamp,
                player_chain_id,
            };

            // Оновити запис гравця
            self.state
                .leaderboard
                .insert(&player_name, entry)
                .expect("Failed to update leaderboard");

            // Оновити топ-10
            self.rebuild_top_leaderboard().await;
        }
    }

    async fn rebuild_top_leaderboard(&mut self) {
        let mut all_entries = Vec::new();
        
        // Зібрати всі записи
        let keys = self.state.leaderboard.indices().await.expect("Failed to get leaderboard keys");
        for key in keys {
            if let Ok(Some(entry)) = self.state.leaderboard.get(&key).await {
                all_entries.push(entry);
            }
        }

        // Сортувати за результатом
        all_entries.sort_by(|a, b| b.score.cmp(&a.score));

        // Взяти топ-10
        all_entries.truncate(10);

        self.state.top_leaderboard.set(all_entries);
    }
} 