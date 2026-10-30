# CampusFind 2.0 - Rule-Based Smart Matching Engine

> **Academic Technical Documentation &bull; B.Tech Computer Science & Engineering (Web Technology PBL)**  
> **Notice**: CampusFind 2.0 uses a deterministic, rule-based heuristic similarity algorithm. It does not employ black-box machine learning or neural networks, ensuring 100% explainability and transparency for college evaluation and viva presentations.

---

## 1. Algorithmic Overview & Weights

The matching engine cross-references missing belonging reports (`lost`) against discovered belongings in custody (`found`) across **5 weighted criteria**, summing to an exact **100% scale**:

| Parameter | Weight | Method of Evaluation | Maximum Points |
|---|---|---|---|
| **Category Similarity** | **30%** | Categorical ID match & normalized taxonomy string comparison | 30 pts |
| **Name & Keyword Overlap** | **25%** | Title substring match + Tokenized Jaccard Similarity coefficient | 25 pts |
| **Campus Location Proximity** | **20%** | Campus block token overlap (e.g. *Library*, *Lab 3*, *Cafeteria*) | 20 pts |
| **Color Alignment** | **15%** | Normalized primary/secondary color token matching | 15 pts |
| **Incident Date Proximity** | **10%** | Absolute elapsed days difference ($|D_2 - D_1|$) | 10 pts |
| **Total Available Score** | **100%** | Linear sum of verified component weights | **100 pts** |

---

## 2. Mathematical Formulations & Component Logic

### 1. Category Similarity ($S_{\text{cat}}$)
$$S_{\text{cat}} = \begin{cases} 30, & \text{if } \text{cat}_{\text{lost}} = \text{cat}_{\text{found}} \\ 0, & \text{otherwise} \end{cases}$$

### 2. Item Name & Keyword Overlap ($S_{\text{kw}}$)
Let $T_1, T_2$ be the set of meaningful tokens extracted from titles and descriptions after lowercasing, punctuation stripping, and stop-word filtering:
$$\text{Jaccard}(T_1, T_2) = \frac{|T_1 \cap T_2|}{|T_1 \cup T_2|}$$
If a strong title substring match exists: $S_{\text{kw}} = 25$.  
Otherwise:
$$S_{\text{kw}} = \min(1.0, 2.5 \times \text{Jaccard}(T_1, T_2)) \times 25$$

### 3. Campus Location Proximity ($S_{\text{loc}}$)
Campus areas share common landmarks (*Mech Lab*, *Reading Room*, *Auditorium*).
$$S_{\text{loc}} = \begin{cases} 20, & \text{if } |L_1 \cap L_2| \ge 2 \\ 15, & \text{if } |L_1 \cap L_2| = 1 \\ 0, & \text{if no common location tokens} \end{cases}$$

### 4. Color Alignment ($S_{\text{col}}$)
$$S_{\text{col}} = \begin{cases} 15, & \text{if } C_1 \cap C_2 \neq \emptyset \\ 0, & \text{otherwise} \end{cases}$$

### 5. Date Proximity ($S_{\text{date}}$)
Let $\Delta t = |t_{\text{found}} - t_{\text{lost}}|$ in calendar days:
$$S_{\text{date}} = \begin{cases} 10, & \text{if } \Delta t \le 2 \text{ days} \\ 7, & \text{if } 3 \le \Delta t \le 5 \text{ days} \\ 4, & \text{if } 6 \le \Delta t \le 10 \text{ days} \\ 0, & \text{if } \Delta t > 10 \text{ days} \end{cases}$$

---

## 3. Sample Match Calculation (From Seed Data)

### Comparison:
- **Lost Report #1**: *"Casio Scientific Calculator fx-991EX"* (Category: Electronics [ID: 1], Color: Black, Location: Mechanical Lab 3, Date: 2026-10-29)
- **Found Report #2**: *"Casio fx-991EX Classwiz Calculator"* (Category: Electronics [ID: 1], Color: Black, Location: Mechanical Lab 3, Date: 2026-10-30)

| Criteria | Computation | Score |
|---|---|---|
| Category | Both belong to Category 1 (*Electronics & Gadgets*) | **30 / 30** |
| Title/Keywords | Common tokens: `{"casio", "fx", "991ex", "calculator"}` | **25 / 25** |
| Color | Both items are `"Black"` | **15 / 15** |
| Location | Both items reported at `"Mechanical Lab 3"` (2 tokens: `mechanical`, `lab`) | **20 / 20** |
| Date Proximity | $|2026\text{-}10\text{-}30 - 2026\text{-}10\text{-}29| = 1 \text{ day} \le 2 \text{ days}$ | **10 / 10** |
| **Final Score** | **30 + 25 + 15 + 20 + 10** | **100% Match** |

---

## 4. Anti-False-Positive Rules & Guards

1. **Self-Exclusion**: An item is never matched against itself (`item1.id !== item2.id`).
2. **Catalog Direction**: Lost items are only matched against Found items (and vice versa).
3. **Status Filtering**: Items marked `recovered` or `closed` are strictly excluded from the match pool.
4. **Configurable Thresholding**: Matches below 40% are filtered out to avoid spamming students with irrelevant suggestions.
5. **Deduplication**: Match pairs $(A, B)$ are deduplicated using set hashing to prevent duplicate alert cards.
6. **Explicit Labeling**: Every suggestion is labeled as a **"Possible Match"** with human-readable reasoning to ensure safe verification.

