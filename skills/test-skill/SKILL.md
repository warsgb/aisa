---
slug: test-skill
name: Test Skill
description: A test skill for verification of the skill loading system
category: test
usage_hint: Use this skill to test the system
parameters:
  - name: input
    type: string
    label: Input
    required: true
    placeholder: Enter test input
supports_multi_turn: false
---

# Test Skill

This is a test skill created to verify the skill loading system is working correctly.

## Usage

You can use this skill to verify that:
1. Skills are loading from the file system
2. Frontmatter is being parsed correctly
3. Skills are being saved to the database

## System Instructions

When this skill is executed, respond with a confirmation that the skill system is working.
