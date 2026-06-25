import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Slider, Select, MenuItem, Checkbox, ListItemText } from "@mui/material";
import "./PreferenceFilter.css";
import api, { BASE_URL } from "./../../api/axios";

// Use an uppercase alias to satisfy linters that expect component identifiers
const MotionDiv = motion.div;

// --- Relationship Options ---
const allRelationshipOptions = [
  { value: 'single', label: 'Single', icon: 'person' },
  { value: 'in_a_relationship', label: 'In a relationship', icon: 'favorite' },
  { value: 'its_complicated', label: 'It\'s complicated', icon: 'question_mark' },
  { value: 'open_relationship', label: 'Open relationship', icon: 'group' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', icon: 'visibility_off' },
  { value: 'divorced', label: 'Divorced', icon: 'person_off' },
  { value: 'engaged', label: 'Engaged', icon: 'diamond' },
  { value: 'married', label: 'Married', icon: 'handshake' },
  { value: 'dating_casually', label: 'Dating casually', icon: 'coffee' }
];

export default function PreferenceFilter({ show, onClose, userId }) {
  const [ageRange, setAgeRange] = useState([25, 45]);
  const [relationshipAll, setRelationshipAll] = useState(true);
  const [relationshipStatuses, setRelationshipStatuses] = useState(allRelationshipOptions.map(o => o.value));
  const [showMeAll, setShowMeAll] = useState(true);
  const [showMeSelections, setShowMeSelections] = useState(["male", "female"]);
  const [distance, setDistance] = useState(500); 

  // ✅ Load preferences when the modal opens
  useEffect(() => {
    if (!show) return;

    if (!userId) return; // Ensure we only load for real logged-in user

    fetch(`${BASE_URL}/matches/preferences/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch preferences");
        return res.json();
      })
      .then((data) => {
        if (data.filter_by) {
          const fb = data.filter_by || {};
          setAgeRange([fb.from_age ?? ageRange[0], fb.to_age ?? ageRange[1]]);
          const relAll = !!fb.relationship_all;
          const relList = Array.isArray(fb.relationship_statuses) ? fb.relationship_statuses : null;
          const relSingle = fb.relationship || null;
          if (relAll) {
            setRelationshipAll(true);
            setRelationshipStatuses(allRelationshipOptions.map(o => o.value));
          } else if (relList && relList.length > 0) {
            setRelationshipAll(false);
            setRelationshipStatuses(relList);
          } else if (relSingle) {
            setRelationshipAll(false);
            setRelationshipStatuses([relSingle]);
          } else {
            setRelationshipAll(true);
            setRelationshipStatuses(allRelationshipOptions.map(o => o.value));
          }
          if ((fb.gender || "all") === "all") {
            setShowMeAll(true);
            setShowMeSelections(["male", "female"]);
          } else if (fb.gender === "male" || fb.gender === "female") {
            setShowMeAll(false);
            setShowMeSelections([fb.gender]);
          }
          // Support both legacy 'distance' and new 'bio_length_max'
          const bioLen = fb.bio_length_max ?? fb.distance;
          setDistance(bioLen ?? 500);
          // Prefer locally saved Show Me if present; otherwise default opposite of user gender
          try {
            const savedShowMe = localStorage.getItem("pref_show_me");
            if (savedShowMe) {
              if (savedShowMe === "all") {
                setShowMeAll(true);
                setShowMeSelections(["male", "female"]);
              } else {
                setShowMeAll(false);
                setShowMeSelections([savedShowMe]);
              }
            } else if (!fb.gender) {
              api
                .get(`${BASE_URL}/users/${userId}`)
                .then((resUser) => {
                  const userGender = resUser?.data?.gender || resUser?.data?.profile?.gender;
                  let defaultShowMe = "all";
                  if (userGender === "male") defaultShowMe = "female";
                  else if (userGender === "female") defaultShowMe = "male";
                  if (defaultShowMe === "all") {
                    setShowMeAll(true);
                    setShowMeSelections(["male", "female"]);
                  } else {
                    setShowMeAll(false);
                    setShowMeSelections([defaultShowMe]);
                  }
                  try { 
                    localStorage.setItem("pref_show_me", defaultShowMe); 
                  } catch (e) { 
                    console.debug("localStorage write pref_show_me failed", e); 
                  }
                })
                .catch((err) => { 
                  console.warn("Failed to fetch user for default Show Me", err); 
                });
            }
          } catch (e) {
            console.debug("localStorage read pref_show_me failed", e);
          }
        }
      })
      .catch((err) => console.error("❌ Fetch error:", err));
  }, [show, userId]);

  // ✅ Save preferences (POST)
  const applyFilters = async () => {
    const payload = {
      user_id: userId,
      filter_by: {
        from_age: ageRange[0],
        to_age: ageRange[1],
        gender: showMeAll ? "all" : (showMeSelections[0] || "all"),
        // Store bio length explicitly to avoid confusion with geo-distance
        bio_length_max: distance,
        // Relationship filtering: support multi-select and 'All relationships'
        relationship_all: relationshipAll,
        relationship_statuses: relationshipAll ? [] : relationshipStatuses,
      },
    };

    try {
      const response = await fetch(`${BASE_URL}/matches/preferences/set`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save preferences");
      const result = await response.json();
      // Log only the filtered categories to avoid noise
      console.log("✅ Filter-by saved:", result.filter_by ?? payload.filter_by);
      // Notify parent components that preferences have updated
      try {
        window.dispatchEvent(
          new CustomEvent('preferences-updated', { detail: result.filter_by ?? payload.filter_by })
        );
      } catch {
        // Fallback in older environments
        window.dispatchEvent(new Event('preferences-updated'));
      }
      // Persist Show Me locally for consistency across refreshes
      try { 
        localStorage.setItem('pref_show_me', showMeAll ? 'all' : (showMeSelections[0] || 'all')); 
      } catch (e) { 
        console.debug('localStorage write pref_show_me failed', e); 
      }
      onClose();
    } catch (error) {
      console.error("❌ Error saving preferences:", error);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <MotionDiv
          className="filter-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <MotionDiv
            className="filter-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            <header className="filter-header">
              <span className="font-bold text-lg mb-3">Match Preferences</span>
              <button onClick={onClose} className="close-btn">
                ✕
              </button>
            </header>

            <div className="filter-content josefin-sans">
              <div className="filter-group">
                <label htmlFor="showMeSelect">Show Me</label>
                <Select
                  id="showMeSelect"
                  multiple
                  value={showMeAll ? ['__all__'] : showMeSelections}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.includes('__all__')) {
                      setShowMeAll(true);
                      setShowMeSelections(["male", "female"]);
                    } else {
                      const v = Array.isArray(value) ? value.filter(x => x !== '__all__') : [];
                      if (v.includes('male') && v.includes('female')) {
                        setShowMeAll(true);
                        setShowMeSelections(["male", "female"]);
                      } else {
                        setShowMeAll(false);
                        setShowMeSelections(v);
                      }
                    }
                  }}
                  renderValue={(selected) => {
                    if (showMeAll) return 'Everyone';
                    const labels = [
                      selected.includes('male') ? 'Male' : null,
                      selected.includes('female') ? 'Female' : null
                    ].filter(Boolean);
                    return labels.join(', ') || 'Select audience';
                  }}
                  fullWidth
                  size="small"
                  className="prompt-select josefin-sans"
                  MenuProps={{
                    PaperProps: {
                      className: 'filter-dropdown-menu',
                      sx: {
                        borderRadius: '12px',
                        marginTop: '8px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                        border: '1px solid rgba(255, 127, 127, 0.15)',
                        background: 'linear-gradient(180deg, #FFFFFF 0%, #FDF9F0 100%)',
                        padding: '8px',
                      }
                    }
                  }}
                >
                  <MenuItem className="dropdown-option josefin-sans" value="__all__">
                    <Checkbox checked={showMeAll} />
                    <ListItemText primary="Everyone" />
                  </MenuItem>
                  <MenuItem className="dropdown-option josefin-sans" value="male">
                    <Checkbox checked={showMeSelections.indexOf('male') > -1 && !showMeAll} />
                    <ListItemText primary="Male" />
                  </MenuItem>
                  <MenuItem className="dropdown-option josefin-sans" value="female">
                    <Checkbox checked={showMeSelections.indexOf('female') > -1 && !showMeAll} />
                    <ListItemText primary="Female" />
                  </MenuItem>
                </Select>
              </div>

              <div className="filter-group">
                <div className="filter-label-row">
                  <label id="ageRangeLabel">Age Range</label>
                  <span className="current-value">
                    {ageRange[0]} – {ageRange[1]}
                  </span>
                </div>
                <Slider
                  value={ageRange}
                  onChange={(e, v) => setAgeRange(v)}
                  valueLabelDisplay="auto"
                  min={18}
                  max={60}
                  aria-labelledby="ageRangeLabel"
                  sx={{ color: "#ff5b5b" }}
                />
              </div>

              {/* 🆕 Distance Filter (0 to 500) */}
              <div className="filter-group">
                <div className="filter-label-row">
                  <label id="bioLengthLabel">Bio Length</label>
                  <span className="current-value">
                    {distance} characters
                  </span>
                </div>
                <Slider
                  value={distance}
                  onChange={(e, v) => setDistance(v)}
                  valueLabelDisplay="auto"
                  min={0}
                  max={500}
                  step={10} 
                  aria-labelledby="bioLengthLabel"
                  sx={{ color: "#ff5b5b" }}
                />
              </div>
              {/* End Distance Filter */}

              {/* Relationship Filter */}
              <div className="filter-group josefin-sans">
                <label htmlFor="relationshipSelect">Relationship Status</label>
                <Select
                  id="relationshipSelect"
                  multiple
                  value={relationshipAll ? ['__all__'] : relationshipStatuses}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.includes('__all__')) {
                      setRelationshipAll(true);
                      setRelationshipStatuses(allRelationshipOptions.map(o => o.value));
                    } else {
                      setRelationshipAll(false);
                      setRelationshipStatuses(value);
                    }
                  }}
                  renderValue={(selected) => {
                    if (relationshipAll) return 'All relationships';
                    const labels = allRelationshipOptions
                      .filter(o => selected.includes(o.value))
                      .map(o => o.label);
                    return labels.join(', ') || 'Select relationships';
                  }}
                  fullWidth
                  size="small"
                  className="prompt-select josefin-sans"
                  MenuProps={{
                    PaperProps: {
                      className: 'filter-dropdown-menu',
                      sx: {
                        borderRadius: '12px',
                        marginTop: '8px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                        border: '1px solid rgba(255, 127, 127, 0.15)',
                        background: 'linear-gradient(180deg, #FFFFFF 0%, #FDF9F0 100%)',
                        padding: '8px',
                      }
                    }
                  }}
                >
                  <MenuItem className="dropdown-option josefin-sans" value="__all__">
                    <Checkbox checked={relationshipAll} />
                    <ListItemText primary="All relationships" />
                  </MenuItem>
                  {allRelationshipOptions.map((option) => (
                    <MenuItem className="dropdown-option josefin-sans" key={option.value} value={option.value}>
                      <Checkbox checked={relationshipStatuses.indexOf(option.value) > -1 && !relationshipAll} />
                      <ListItemText primary={option.label} />
                    </MenuItem>
                  ))}
                </Select>
              </div>
              {/* End Relationship Filter */}

            </div>

            <footer className="filter-footer josefin-sans">

              <button onClick={applyFilters} className="action-buttons josefin-sans">
                Apply Filters
              </button>

            </footer>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}