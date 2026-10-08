-- Expand Quickfire and TypeRush pools. Existing rows are left unchanged.
INSERT INTO "arena_quickfire_questions" (
  "question", "option_a", "option_b", "option_c", "option_d", "correct_option", "category", "difficulty"
)
SELECT * FROM (VALUES
  ('What is the capital of France?', 'Paris', 'Lyon', 'Marseille', 'Nice', 'A', 'Geography', 'easy'),
  ('Which ocean is the largest?', 'Atlantic', 'Pacific', 'Indian', 'Arctic', 'B', 'Geography', 'easy'),
  ('What is the chemical symbol for gold?', 'Ag', 'Fe', 'Au', 'Pb', 'C', 'Science', 'easy'),
  ('How many continents are there?', '5', '6', '7', '8', 'C', 'Geography', 'easy'),
  ('Who wrote Romeo and Juliet?', 'William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Homer', 'A', 'Culture', 'easy'),
  ('Which planet is closest to the Sun?', 'Mercury', 'Venus', 'Earth', 'Mars', 'A', 'Science', 'easy'),
  ('How many players are on the field for one soccer team?', '9', '10', '11', '12', 'C', 'Sports', 'easy'),
  ('What does CPU stand for?', 'Central Processing Unit', 'Computer Personal Unit', 'Core Program Utility', 'Control Panel Unit', 'A', 'Technology', 'easy'),
  ('Which country is home to the Great Wall?', 'Japan', 'India', 'China', 'Korea', 'C', 'History', 'easy'),
  ('What is the currency of Japan?', 'Won', 'Yuan', 'Dollar', 'Yen', 'D', 'Everyday', 'easy'),
  ('Which is the largest mammal?', 'Blue whale', 'African elephant', 'Giraffe', 'Polar bear', 'A', 'Science', 'easy'),
  ('Who painted the Mona Lisa?', 'Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Michelangelo', 'C', 'Culture', 'medium'),
  ('In which country are the Pyramids of Giza?', 'Mexico', 'Egypt', 'Peru', 'Greece', 'B', 'History', 'easy'),
  ('What is the primary language of Brazil?', 'Spanish', 'French', 'English', 'Portuguese', 'D', 'Geography', 'easy'),
  ('Which sport is played with a puck on ice?', 'Ice hockey', 'Curling', 'Figure skating', 'Bobsleigh', 'A', 'Sports', 'easy'),
  ('At sea level, water boils at how many degrees Celsius?', '90', '100', '110', '120', 'B', 'Science', 'easy'),
  ('Which instrument commonly has 88 keys?', 'Guitar', 'Violin', 'Piano', 'Flute', 'C', 'Entertainment', 'easy'),
  ('How many sides does a hexagon have?', '5', '6', '7', '8', 'B', 'Everyday', 'easy'),
  ('Which gas do plants take in during photosynthesis?', 'Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium', 'C', 'Science', 'medium'),
  ('What year was the first iPhone released?', '2005', '2007', '2009', '2010', 'B', 'Technology', 'medium'),
  ('Which desert is the largest hot desert in the world?', 'Gobi', 'Kalahari', 'Sahara', 'Atacama', 'C', 'Geography', 'medium')
) AS seed("question", "option_a", "option_b", "option_c", "option_d", "correct_option", "category", "difficulty")
WHERE NOT EXISTS (
  SELECT 1 FROM "arena_quickfire_questions" existing WHERE existing."question" = seed."question"
);

INSERT INTO "arena_typerush_challenges" (
  "challenge_text", "normalized_text", "category", "difficulty"
)
SELECT * FROM (VALUES
  ('KIRAKITAH rewards speed, focus, and precision.', 'KIRAKITAH rewards speed, focus, and precision.', 'Brand', 'easy'),
  ('The score was 3-2 after extra time.', 'The score was 3-2 after extra time.', 'Sports', 'easy'),
  ('Pack 12 red cables and 4 spare adapters.', 'Pack 12 red cables and 4 spare adapters.', 'Everyday', 'medium'),
  ('"Keep going," she said, "the round is not over."', '"Keep going," she said, "the round is not over."', 'Dialogue', 'medium'),
  ('A calm start beats a rushed finish.', 'A calm start beats a rushed finish.', 'Motivation', 'easy'),
  ('Meet at Gate B, Platform 9, before 18:40.', 'Meet at Gate B, Platform 9, before 18:40.', 'Travel', 'medium'),
  ('Quick hands. Clear eyes. Exact letters.', 'Quick hands. Clear eyes. Exact letters.', 'Focus', 'easy'),
  ('The river crossed three cities before reaching the sea.', 'The river crossed three cities before reaching the sea.', 'Nature', 'medium'),
  ('Order #4821 ships on Monday at 09:15.', 'Order #4821 ships on Monday at 09:15.', 'Everyday', 'hard'),
  ('Type each mark, capital, and number exactly.', 'Type each mark, capital, and number exactly.', 'Instruction', 'easy'),
  ('Nairobi, Lagos, and Accra share one afternoon.', 'Nairobi, Lagos, and Accra share one afternoon.', 'Geography', 'medium')
) AS seed("challenge_text", "normalized_text", "category", "difficulty")
WHERE NOT EXISTS (
  SELECT 1 FROM "arena_typerush_challenges" existing WHERE existing."challenge_text" = seed."challenge_text"
);
