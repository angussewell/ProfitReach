# Workflow Builder Usage Guide

This guide explains how to use the newly refactored Workflow Builder interface.

## Overview

The Workflow Builder allows you to create automated workflows with branching paths and various action types. The interface uses a vertical layout with indentation to clearly show the structure of your workflow, including branches.

## Basic Concepts

- **Trigger Node**: The starting point of every workflow (the blue node at the top)
- **Step Nodes**: Action nodes (Wait, Send Email, etc.) that define what happens in the workflow
- **Branch Nodes**: Split points that create multiple paths based on percentage weights
- **Path Indicators**: Labels that show the beginning of each branch path
- **"+" Buttons**: Used to add new steps to the workflow at specific points

## Creating a Workflow

1. Start by clicking the "Add First Step" button on the Trigger node
2. Select an action type from the modal
3. Configure the action in the configuration modal
4. Continue adding steps using the "+" buttons that appear between steps
5. To create a branch, add a "Branch (Split)" step and configure the percentage splits

## Working with Branches

When you add a Branch step, you'll need to:

1. Define the number of paths (at least 2)
2. Set the percentage weight for each path (must total 100%)
3. Optionally select target steps for each path

After saving a Branch step, you'll see:
- The Branch step in the main flow
- Path indicators showing each branch path (e.g., "Path 1: 50%")
- Indented sections below each path indicator where you can add steps
- "+" buttons at the end of each path to add steps to that specific branch

## Editing and Managing Steps

- **Edit**: Click the pencil icon on any step to modify its configuration
- **Delete**: Click the trash icon to remove a step
- **Reorder**: Use the up/down arrows to change a step's position
- **Custom Names**: Give steps descriptive names for easier identification

## Tips

- Steps added using a path's "+" button are automatically connected to that path
- The branch's configuration automatically updates when you add steps to a path
- The debug view (click the warning icon) shows the raw step data for troubleshooting
- Each step card shows a summary of its configuration for quick reference

## Example Workflow

A typical workflow might look like:
1. Start with a Trigger
2. Add a Wait step (e.g., wait 1 day)
3. Add a Branch step with two paths (50% each)
4. Add a Send Email step to Path 1
5. Add a different Send Email step to Path 2
6. Continue adding steps to each path as needed

The visual layout will clearly show which steps belong to which path through indentation and connecting lines.
