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
    type InstantiationArgument = Option<String>; // player_name (може бути None)
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = DannyGameState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        DannyGameContract { state, runtime }
    }

    async fn instantiate(&mut self, player_name: Self::InstantiationArgument) {
        self.state.value.set(0);
        self.state.best.set(0);
        // Використати "Player" як default, якщо не передано ім'я
        self.state.player_name.set(player_name.unwrap_or_else(|| "Player".to_string()));
        self.state.top_leaderboard.set(Vec::new());
        self.state.is_leaderboard_chain.set(false);
        self.state.leaderboard_chain_id.set(None);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            Operation::Increment { value } => {
                self.state.value.set(self.state.value.get() + value);
            }

            Operation::SetupGame {
                leaderboard_chain_id,
                player_name,
            } => {
                // Дозволити налаштування тільки якщо ще не налаштовано
                if self.state.leaderboard_chain_id.get().is_some() {
                    panic!("Game already configured. Leaderboard chain is already set.");
                }

                // Встановити ID ланцюжка лідерборду для всіх ланцюжків
                self.state
                    .leaderboard_chain_id
                    .set(Some(leaderboard_chain_id));

                // Якщо цей ланцюжок призначений як ланцюжок лідерборду
                if self.runtime.chain_id() == leaderboard_chain_id {
                    self.state.is_leaderboard_chain.set(true);
                }

                self.state.player_name.set(player_name);
            }

            Operation::SetBestAndSubmit { best } => {
                self.state.best.set(best);

                // Відправити тільки якщо ми НЕ є ланцюжком лідерборду та лідерборд встановлено
                if !*self.state.is_leaderboard_chain.get() {
                    if let Some(leaderboard_id) = self.state.leaderboard_chain_id.get() {
                        let player_name = self.state.player_name.get().clone();

                        let message = DannyGameMessage::SubmitScore {
                            player_name,
                            score: best,
                            chain_id: self.runtime.chain_id(),
                        };

                        self.runtime
                            .prepare_message(message)
                            .send_to(*leaderboard_id);
                    }
                }

                // Скинути поточні вбивства на 0
                self.state.value.set(0);
            }

            Operation::RequestLeaderboard => {
                // Запросити тільки якщо ми НЕ є ланцюжком лідерборду та лідерборд встановлено
                if !*self.state.is_leaderboard_chain.get() {
                    if let Some(leaderboard_id) = self.state.leaderboard_chain_id.get() {
                        let message = DannyGameMessage::RequestLeaderboard {
                            requester_chain_id: self.runtime.chain_id(),
                        };

                        self.runtime
                            .prepare_message(message)
                            .send_to(*leaderboard_id);
                    }
                }
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        // Перевірити чи повідомлення відбивається
        let is_bouncing = self
            .runtime
            .message_is_bouncing()
            .unwrap_or_else(|| panic!("Message delivery status must be available"));

        if is_bouncing {
            return;
        }

        match message {
            DannyGameMessage::SubmitScore {
                player_name,
                score,
                chain_id,
            } => {
                // Обробляти тільки на ланцюжку лідерборду
                if !*self.state.is_leaderboard_chain.get() {
                    return;
                }

                // Оновити результат гравця якщо він кращий
                let should_update = match self.state.player_scores.get(&player_name).await {
                    Ok(Some(existing)) => score > existing.score,
                    _ => true,
                };

                if should_update {
                    // Отримати поточний timestamp в мікросекундах
                    let timestamp = self.runtime.system_time().micros();
                    let entry = LeaderboardEntry {
                        player_name: player_name.clone(),
                        score,
                        chain_id,
                        timestamp,
                    };

                    self.state
                        .player_scores
                        .insert(&player_name, entry)
                        .expect("Failed to update player score");

                    // Оновити топ лідерборд
                    self.update_top_leaderboard().await;
                }
            }

            DannyGameMessage::RequestLeaderboard { requester_chain_id } => {
                // Обробляти тільки на ланцюжку лідерборду
                if !*self.state.is_leaderboard_chain.get() {
                    return;
                }

                let leaderboard = self.state.top_leaderboard.get().clone();
                let response = DannyGameMessage::LeaderboardUpdate {
                    entries: leaderboard,
                };

                self.runtime
                    .prepare_message(response)
                    .send_to(requester_chain_id);
            }

            DannyGameMessage::LeaderboardUpdate { entries } => {
                // Оновити локальний кеш лідерборду на ланцюжках гравців
                self.state.top_leaderboard.set(entries);
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl DannyGameContract {
    async fn update_top_leaderboard(&mut self) {
        // Зібрати всі результати
        let mut all_scores = Vec::new();

        // Це спрощена версія - в продакшені ви б хотіли оптимізувати це
        let keys = self
            .state
            .player_scores
            .indices()
            .await
            .expect("Failed to get player names");

        for player_name in keys {
            if let Ok(Some(entry)) = self.state.player_scores.get(&player_name).await {
                all_scores.push(entry);
            }
        }

        // Сортувати за результатом в спадаючому порядку
        all_scores.sort_by(|a, b| b.score.cmp(&a.score));

        // Взяти топ 10
        let top_10: Vec<LeaderboardEntry> = all_scores.into_iter().take(10).collect();

        self.state.top_leaderboard.set(top_10);
    }
} 